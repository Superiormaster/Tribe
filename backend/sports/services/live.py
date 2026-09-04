from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone

from sports.models import Match

from sports.services.provider import (
    BaseSportsProvider,
    ProviderResponse,
    get_sports_provider,
)
from sports.services.matches import MatchService


class LiveMatchServiceError(Exception):
    """Base exception for live match service errors."""


class LiveMatchService:
    """
    Handles synchronization of currently live matches.

    Live flow:

        Sports Provider
              ↓
        LiveMatchService
              ↓
        PostgreSQL
              ↓
        Redis
              ↓
        WebSocket / API
              ↓
        Tribe frontend

    Only active matches should be synchronized frequently.
    """

    # Provider status codes that normally represent
    # an actively running football match.
    LIVE_STATUSES = {
        "1H",
        "2H",
        "ET",
        "P",
        "LIVE",
        "HT",
        "BT",
        "INT",
    }

    # Matches that have finished and should no longer be
    # treated as live.
    FINISHED_STATUSES = {
        "FT",
        "AET",
        "PEN",
        "CANC",
        "PST",
        "ABD",
        "AWD",
        "WO",
    }

    def __init__(
        self,
        provider: BaseSportsProvider | None = None,
    ):
        self.provider = (
            provider or get_sports_provider()
        )

        self.match_service = MatchService(
            provider=self.provider
        )

    def sync_live_matches(self):

      live_matches = Match.objects.filter(
          status__in=LIVE_STATUSES
      )
  
      match_ids = list(
          live_matches.values_list(
              "provider_id",
              flat=True,
          )
      )
  
      if not match_ids:
          SportsCache.clear_live_matches()
  
          return []
  
      batches = [
          match_ids[i:i + 20]
          for i in range(
              0,
              len(match_ids),
              20,
          )
      ]
  
      all_matches = []
  
      for batch in batches:
  
          response = self.provider.get_matches_by_ids(
              batch
          )
  
          provider_matches = response.data or []
  
          # Save/update PostgreSQL
          # Update Redis
          # Broadcast WebSocket
  
          all_matches.extend(
              provider_matches
          )
  
      return all_matches
    def sync_live_matches(
        self,
    ) -> list[Match]:
        """
        Fetch the current live matches from the provider.

        This is the method Celery will call frequently
        during active matches.
        """

        response = self.provider.get_live_matches()

        rows = self._extract_rows(
            response
        )

        matches: list[Match] = []

        for row in rows:

            match = (
                self._sync_live_match(
                    row
                )
            )

            if match:
                matches.append(
                    match
                )

        return matches

    def sync_live_match(
        self,
        match_id: int,
    ) -> Match | None:
        """
        Synchronize one currently live match.

        This is useful when a user opens a match page.
        """

        response = (
            self.provider.get_live_match(
                match_id
            )
        )

        rows = self._extract_rows(
            response
        )

        if not rows:
            return None

        match = (
            self._sync_live_match(
                rows[0]
            )
        )

        if not match:
            return None

        # Live pages need events, lineups and statistics.
        self.match_service.sync_match_events(
            match_id
        )

        self.match_service.sync_match_lineups(
            match_id
        )

        self.match_service.sync_match_statistics(
            match_id
        )

        return match

    @transaction.atomic
    def _sync_live_match(
        self,
        data: dict[str, Any],
    ) -> Match | None:
        """
        Synchronize the actual score/status data.

        We reuse MatchService so there is only one place
        responsible for translating provider match data
        into the Match model.
        """

        fixture = (
            data.get("fixture")
            or data.get("match")
            or {}
        )

        if not isinstance(
            fixture,
            dict,
        ):
            fixture = {}

        provider_id = self._to_int(
            fixture.get("id")
            or data.get("id")
        )

        if not provider_id:
            return None

        # MatchService handles the actual database mapping.
        match = (
            self.match_service._sync_match(
                data
            )
        )

        if not match:
            return None

        status = (
            match.status or ""
        ).upper()

        if status in self.FINISHED_STATUSES:
            self._mark_no_longer_live(
                match
            )

        else:
            self._mark_live(
                match
            )

        return match

    @transaction.atomic
    def _mark_live(
        self,
        match: Match,
    ) -> Match:
        """
        Update metadata used by the live API/cache.
        """

        updates = {
            "is_live": True,
            "last_live_update": timezone.now(),
        }

        # Some projects may not have these fields yet.
        # We use direct setattr so the service remains easy
        # to integrate while the model is being finalized.

        for field, value in updates.items():

            if hasattr(
                match,
                field,
            ):
                setattr(
                    match,
                    field,
                    value,
                )

        update_fields = [
            field
            for field in updates
            if hasattr(
                match,
                field,
            )
        ]

        if update_fields:
            match.save(
                update_fields=update_fields
            )

        return match

    @transaction.atomic
    def _mark_no_longer_live(
        self,
        match: Match,
    ) -> Match:

        if hasattr(
            match,
            "is_live",
        ):
            match.is_live = False

            match.save(
                update_fields=[
                    "is_live"
                ]
            )

        return match

    def sync_live_details(
        self,
        match_id: int,
    ) -> dict[str, Any]:
        """
        Synchronize all live information for one match.

        Returns database objects rather than making the frontend
        understand the external provider's format.
        """

        match = Match.objects.filter(
            provider_id=match_id
        ).first()

        if not match:
            match = self.sync_live_match(
                match_id
            )

        if not match:
            return {}

        events = (
            self.match_service
            .sync_match_events(
                match_id
            )
        )

        lineups = (
            self.match_service
            .sync_match_lineups(
                match_id
            )
        )

        statistics = (
            self.match_service
            .sync_match_statistics(
                match_id
            )
        )

        return {
            "match": match,
            "events": events,
            "lineups": lineups,
            "statistics": statistics,
        }

    @classmethod
    def is_live_status(
        cls,
        status: str | None,
    ) -> bool:

        if not status:
            return False

        return (
            status.upper()
            in cls.LIVE_STATUSES
        )

    def get_cached_live_matches(self):
        """
        Read live matches from PostgreSQL.

        No provider request is made here.

        Redis can be placed in front of this method later.
        """

        queryset = (
            Match.objects
            .filter(
                is_live=True
            )
            .select_related(
                "home_team",
                "away_team",
                "competition",
                "season",
            )
            .order_by(
                "scheduled_at"
            )
        )

        return queryset

    def cleanup_stale_live_matches(
        self,
        *,
        max_age_minutes: int = 20,
    ) -> int:
        """
        Protects the live table from becoming stale if
        the provider stops returning a match.

        A match that has not received a live update for
        too long is removed from the live state.

        The match itself is NOT deleted.
        """

        cutoff = (
            timezone.now()
            - timezone.timedelta(
                minutes=max_age_minutes
            )
        )

        queryset = Match.objects.filter(
            is_live=True,
            last_live_update__lt=cutoff,
        )

        count = queryset.count()

        queryset.update(
            is_live=False
        )

        return count

    @staticmethod
    def _extract_rows(
        response: ProviderResponse,
    ) -> list[dict[str, Any]]:
        """
        Normalize provider response formats.
        """

        data = response.data

        if isinstance(
            data,
            dict,
        ):

            rows = data.get(
                "response"
            )

            if isinstance(
                rows,
                list,
            ):
                return [
                    row
                    for row in rows
                    if isinstance(
                        row,
                        dict,
                    )
                ]

            rows = data.get(
                "data"
            )

            if isinstance(
                rows,
                list,
            ):
                return [
                    row
                    for row in rows
                    if isinstance(
                        row,
                        dict,
                    )
                ]

            if data.get(
                "fixture"
            ):
                return [data]

        if isinstance(
            data,
            list,
        ):
            return [
                row
                for row in data
                if isinstance(
                    row,
                    dict,
                )
            ]

        return []

    @staticmethod
    def _to_int(
        value: Any,
    ) -> int | None:

        if value is None:
            return None

        try:
            return int(
                value
            )

        except (
            TypeError,
            ValueError,
        ):
            return None

def sync_live_matches() -> list[Match]:
    """
    Synchronize all currently live matches.
    """

    service = LiveMatchService()

    return service.sync_live_matches()


def sync_live_match(
    match_id: int,
) -> Match | None:
    """
    Synchronize one live match.
    """

    service = LiveMatchService()

    return service.sync_live_match(
        match_id
    )


def sync_live_details(
    match_id: int,
) -> dict[str, Any]:
    """
    Synchronize score + events + lineups + statistics.
    """

    service = LiveMatchService()

    return service.sync_live_details(
        match_id
    )


def get_live_matches():
    """
    Read locally cached live matches.

    No external API request.
    """

    service = LiveMatchService()

    return service.get_cached_live_matches()


def cleanup_stale_live_matches(
    max_age_minutes: int = 20,
) -> int:
    """
    Mark stale live matches as no longer live.
    """

    service = LiveMatchService()

    return service.cleanup_stale_live_matches(
        max_age_minutes=max_age_minutes
    )