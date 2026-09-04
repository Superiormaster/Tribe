from __future__ import annotations

from datetime import datetime, date
from typing import Any

from django.db import transaction
from django.utils import timezone

from sports.models import (
    Competition,
    CompetitionSeason,
    Match,
    MatchEvent,
    MatchLineup,
    MatchLineupPlayer,
    MatchStatistic,
    Team,
)

from sports.services.provider import (
    BaseSportsProvider,
    ProviderResponse,
    get_sports_provider,
)


class MatchServiceError(Exception):
    """Base exception for match service errors."""


class MatchService:
    """
    Synchronizes fixtures, results, live matches, events,
    lineups and statistics from the sports provider.

    Database is the source used by Tribe's frontend.

    The external provider is only queried when this service
    needs fresh data.
    """

    def __init__(
        self,
        provider: BaseSportsProvider | None = None,
    ):
        self.provider = provider or get_sports_provider()

    def sync_matches(
        self,
        *,
        date_value: str | date | None = None,
        from_date: str | date | None = None,
        to_date: str | date | None = None,
        competition_id: int | None = None,
        season: int | None = None,
        team_id: int | None = None,
        live: str | None = None,
        status: str | None = None,
    ) -> list[Match]:
        """
        Synchronize fixtures/results/live matches.

        Examples:

            Today's fixtures:

                sync_matches(
                    date_value="2026-08-16"
                )

            Premier League:

                sync_matches(
                    competition_id=39,
                    season=2026
                )

            Team matches:

                sync_matches(
                    team_id=40,
                    season=2026
                )

            Live:

                sync_matches(
                    live="all"
                )
        """

        params: dict[str, Any] = {}

        if date_value:
            params["date"] = self._format_date(
                date_value
            )

        if from_date:
            params["from"] = self._format_date(
                from_date
            )

        if to_date:
            params["to"] = self._format_date(
                to_date
            )

        if competition_id:
            params["league"] = competition_id

        if season:
            params["season"] = season

        if team_id:
            params["team"] = team_id

        if live:
            params["live"] = live

        if status:
            params["status"] = status

        response = self.provider.get_matches(
            **params
        )

        rows = self._extract_rows(
            response
        )

        matches: list[Match] = []

        for row in rows:
            match = self._sync_match(
                row
            )

            if match:
                matches.append(match)

        return matches

    def sync_match(
        self,
        match_id: int,
    ) -> Match | None:
        """
        Synchronize one match.
        """

        response = self.provider.get_match(
            match_id
        )

        rows = self._extract_rows(
            response
        )

        if not rows:
            return None

        return self._sync_match(
            rows[0]
        )

    def sync_match_events(
        self,
        match_id: int,
    ) -> list[MatchEvent]:
        """
        Synchronize goals, cards, substitutions,
        VAR events and other match events.
        """

        match = Match.objects.filter(
            provider_id=match_id
        ).first()

        if not match:
            match = self.sync_match(
                match_id
            )

        if not match:
            return []

        response = (
            self.provider.get_match_events(
                match_id
            )
        )

        rows = self._extract_rows(
            response
        )

        events: list[MatchEvent] = []

        for row in rows:
            event = self._sync_event(
                match=match,
                data=row,
            )

            if event:
                events.append(event)

        return events

    def sync_match_lineups(
        self,
        match_id: int,
    ) -> list[MatchLineup]:
        """
        Synchronize starting XI, substitutes and
        formation information.
        """

        match = Match.objects.filter(
            provider_id=match_id
        ).first()

        if not match:
            match = self.sync_match(
                match_id
            )

        if not match:
            return []

        response = (
            self.provider.get_match_lineups(
                match_id
            )
        )

        rows = self._extract_rows(
            response
        )

        lineups: list[MatchLineup] = []

        for row in rows:
            lineup = self._sync_lineup(
                match=match,
                data=row,
            )

            if lineup:
                lineups.append(lineup)

        return lineups

    def sync_match_statistics(
        self,
        match_id: int,
    ) -> list[MatchStatistic]:
        """
        Synchronize team statistics for a match.

        Examples:

            possession
            shots
            shots on target
            corners
            fouls
            passes
            offsides
            yellow cards
        """

        match = Match.objects.filter(
            provider_id=match_id
        ).first()

        if not match:
            match = self.sync_match(
                match_id
            )

        if not match:
            return []

        response = (
            self.provider.get_match_statistics(
                match_id
            )
        )

        rows = self._extract_rows(
            response
        )

        statistics: list[MatchStatistic] = []

        for row in rows:
            statistic = (
                self._sync_statistics(
                    match=match,
                    data=row,
                )
            )

            if statistic:
                statistics.append(
                    statistic
                )

        return statistics

    @transaction.atomic
    def _sync_match(
        self,
        data: dict[str, Any],
    ) -> Match | None:
        """
        Convert provider fixture data into Tribe's Match model.
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

        teams = data.get(
            "teams"
        ) or {}

        if not isinstance(
            teams,
            dict,
        ):
            teams = {}

        home_data = teams.get(
            "home"
        ) or {}

        away_data = teams.get(
            "away"
        ) or {}

        if not isinstance(
            home_data,
            dict,
        ):
            home_data = {}

        if not isinstance(
            away_data,
            dict,
        ):
            away_data = {}

        home_provider_id = self._to_int(
            home_data.get("id")
        )

        away_provider_id = self._to_int(
            away_data.get("id")
        )

        home_team = self._get_team(
            home_provider_id
        )

        away_team = self._get_team(
            away_provider_id
        )

        if not home_team or not away_team:
            return None

        league_data = (
            data.get("league")
            or {}
        )

        if not isinstance(
            league_data,
            dict,
        ):
            league_data = {}

        competition_provider_id = (
            self._to_int(
                league_data.get("id")
            )
        )

        competition = None
        competition_season = None

        if competition_provider_id:

            competition = (
                Competition.objects.filter(
                    provider_id=(
                        competition_provider_id
                    )
                ).first()
            )

            league_season = self._to_int(
                league_data.get(
                    "season"
                )
            )

            if competition and league_season:

                competition_season = (
                    CompetitionSeason.objects.filter(
                        competition=competition,
                        season=league_season,
                    ).first()
                )

        status_data = (
            fixture.get("status")
            or {}
        )

        if not isinstance(
            status_data,
            dict,
        ):
            status_data = {}

        score_data = (
            data.get("goals")
            or {}
        )

        if not isinstance(
            score_data,
            dict,
        ):
            score_data = {}

        date_value = self._parse_datetime(
            fixture.get("date")
        )

        elapsed = self._to_int(
            status_data.get(
                "elapsed"
            )
        )

        status_short = self._clean_string(
            status_data.get(
                "short"
            )
        )

        status_long = self._clean_string(
            status_data.get(
                "long"
            )
        )

        home_score = self._to_int(
            score_data.get("home")
        )

        away_score = self._to_int(
            score_data.get("away")
        )

        defaults = {
            "competition": competition,
            "season": competition_season,
            "home_team": home_team,
            "away_team": away_team,
            "scheduled_at": date_value,
            "status": status_short,
            "status_long": status_long,
            "elapsed_minutes": elapsed,
            "home_score": home_score,
            "away_score": away_score,
            "venue_name": self._clean_string(
                (
                    fixture.get(
                        "venue"
                    ) or {}
                ).get("name")
                if isinstance(
                    fixture.get(
                        "venue"
                    ),
                    dict,
                )
                else None
            ),
            "referee": self._clean_string(
                fixture.get(
                    "referee"
                )
            ),
            "provider_data": data,
        }

        match, _ = (
            Match.objects.update_or_create(
                provider_id=provider_id,
                defaults=defaults,
            )
        )

        return match

    @transaction.atomic
    def _sync_event(
        self,
        *,
        match: Match,
        data: dict[str, Any],
    ) -> MatchEvent | None:
        """
        Synchronize one match event.

        Provider event examples:

            Goal
            Yellow Card
            Red Card
            Substitution
            VAR
        """

        time_data = (
            data.get("time")
            or {}
        )

        if not isinstance(
            time_data,
            dict,
        ):
            time_data = {}

        team_data = (
            data.get("team")
            or {}
        )

        if not isinstance(
            team_data,
            dict,
        ):
            team_data = {}

        player_data = (
            data.get("player")
            or {}
        )

        if not isinstance(
            player_data,
            dict,
        ):
            player_data = {}

        assist_data = (
            data.get("assist")
            or {}
        )

        if not isinstance(
            assist_data,
            dict,
        ):
            assist_data = {}

        provider_event_id = self._build_event_key(
            data
        )

        if not provider_event_id:
            return None

        team = self._get_team(
            self._to_int(
                team_data.get("id")
            )
        )

        event_type = self._clean_string(
            data.get("type")
        )

        detail = self._clean_string(
            data.get("detail")
        )

        comments = self._clean_string(
            data.get("comments")
        )

        minute = self._to_int(
            time_data.get("elapsed")
        )

        extra = self._to_int(
            time_data.get("extra")
        )

        player_provider_id = self._to_int(
            player_data.get("id")
        )

        assist_provider_id = self._to_int(
            assist_data.get("id")
        )

        defaults = {
            "team": team,
            "event_type": event_type,
            "detail": detail,
            "minute": minute,
            "extra_minute": extra,
            "player_provider_id": (
                player_provider_id
            ),
            "assist_provider_id": (
                assist_provider_id
            ),
            "comments": comments,
            "provider_data": data,
        }

        event, _ = (
            MatchEvent.objects.update_or_create(
                match=match,
                provider_id=provider_event_id,
                defaults=defaults,
            )
        )

        return event

    @transaction.atomic
    def _sync_lineup(
        self,
        *,
        match: Match,
        data: dict[str, Any],
    ) -> MatchLineup | None:
        """
        Synchronize one team's lineup.
        """

        team_data = (
            data.get("team")
            or {}
        )

        if not isinstance(
            team_data,
            dict,
        ):
            team_data = {}

        team_provider_id = self._to_int(
            team_data.get("id")
        )

        team = self._get_team(
            team_provider_id
        )

        if not team:
            return None

        formation = self._clean_string(
            data.get("formation")
        )

        coach_data = (
            data.get("coach")
            or {}
        )

        if not isinstance(
            coach_data,
            dict,
        ):
            coach_data = {}

        coach_name = self._clean_string(
            coach_data.get("name")
        )

        lineup, _ = (
            MatchLineup.objects.update_or_create(
                match=match,
                team=team,
                defaults={
                    "formation": formation,
                    "coach_name": coach_name,
                    "provider_data": data,
                },
            )
        )
  
        start_xi = (
            data.get("startXI")
            or []
        )

        if isinstance(
            start_xi,
            list,
        ):

            for item in start_xi:

                if not isinstance(
                    item,
                    dict,
                ):
                    continue

                self._sync_lineup_player(
                    lineup=lineup,
                    data=item,
                    is_starting=True,
                )

        substitutes = (
            data.get("substitutes")
            or []
        )

        if isinstance(
            substitutes,
            list,
        ):

            for item in substitutes:

                if not isinstance(
                    item,
                    dict,
                ):
                    continue

                self._sync_lineup_player(
                    lineup=lineup,
                    data=item,
                    is_starting=False,
                )

        return lineup

    @transaction.atomic
    def _sync_lineup_player(
        self,
        *,
        lineup: MatchLineup,
        data: dict[str, Any],
        is_starting: bool,
    ) -> MatchLineupPlayer | None:
        """
        Synchronize one player in a match lineup.
        """

        player_data = (
            data.get("player")
            or {}
        )

        if not isinstance(
            player_data,
            dict,
        ):
            player_data = {}

        provider_player_id = self._to_int(
            player_data.get("id")
        )

        if not provider_player_id:
            return None

        player = self._get_player(
            provider_player_id
        )

        position_data = (
            data.get("pos")
            or data.get("position")
        )

        position = self._clean_string(
            position_data
        )

        number = self._to_int(
            data.get("number")
        )

        grid = self._clean_string(
            data.get("grid")
        )

        defaults = {
            "player": player,
            "is_starting": is_starting,
            "position": position,
            "shirt_number": number,
            "grid": grid,
            "provider_data": data,
        }

        lineup_player, _ = (
            MatchLineupPlayer.objects.update_or_create(
                lineup=lineup,
                player_provider_id=(
                    provider_player_id
                ),
                defaults=defaults,
            )
        )

        return lineup_player

    @transaction.atomic
    def _sync_statistics(
        self,
        *,
        match: Match,
        data: dict[str, Any],
    ) -> MatchStatistic | None:
        """
        Synchronize team statistics.

        We deliberately store the raw provider payload too.
        That lets us add new statistics later without
        redesigning the database immediately.
        """

        team_data = (
            data.get("team")
            or {}
        )

        if not isinstance(
            team_data,
            dict,
        ):
            team_data = {}

        team_provider_id = self._to_int(
            team_data.get("id")
        )

        team = self._get_team(
            team_provider_id
        )

        if not team:
            return None

        statistics = (
            data.get("statistics")
            or []
        )

        if not isinstance(
            statistics,
            list,
        ):
            statistics = []

        normalized: dict[str, Any] = {}

        for item in statistics:

            if not isinstance(
                item,
                dict,
            ):
                continue

            statistic_type = (
                self._clean_string(
                    item.get("type")
                )
            )

            value = item.get(
                "value"
            )

            if statistic_type:
                normalized[
                    self._normalize_stat_name(
                        statistic_type
                    )
                ] = self._normalize_stat_value(
                    value
                )

        defaults = {
            "possession": normalized.get(
                "possession"
            ),
            "shots": normalized.get(
                "shots"
            ),
            "shots_on_target": normalized.get(
                "shots_on_target"
            ),
            "passes": normalized.get(
                "passes"
            ),
            "passes_accuracy": normalized.get(
                "passes_accuracy"
            ),
            "fouls": normalized.get(
                "fouls"
            ),
            "corners": normalized.get(
                "corners"
            ),
            "offsides": normalized.get(
                "offsides"
            ),
            "yellow_cards": normalized.get(
                "yellow_cards"
            ),
            "red_cards": normalized.get(
                "red_cards"
            ),
            "provider_data": data,
        }

        statistic, _ = (
            MatchStatistic.objects.update_or_create(
                match=match,
                team=team,
                defaults=defaults,
            )
        )

        return statistic

    @staticmethod
    def _get_team(
        provider_id: int | None,
    ) -> Team | None:

        if not provider_id:
            return None

        return Team.objects.filter(
            provider_id=provider_id
        ).first()

    @staticmethod
    def _get_player(
        provider_id: int | None,
    ):

        if not provider_id:
            return None

        from sports.models import Player

        return Player.objects.filter(
            provider_id=provider_id
        ).first()

    @staticmethod
    def _extract_rows(
        response: ProviderResponse,
    ) -> list[dict[str, Any]]:
        """
        Normalize provider responses.
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

            if data.get(
                "events"
            ):
                return [
                    {
                        "events": data[
                            "events"
                        ]
                    }
                ]

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
    def _build_event_key(
        data: dict[str, Any],
    ) -> str | None:
        """
        Some providers don't expose a stable event ID.

        We therefore build a deterministic key from the
        important event attributes.
        """

        provider_id = data.get(
            "id"
        )

        if provider_id is not None:
            return str(
                provider_id
            )

        time_data = (
            data.get("time")
            or {}
        )

        team_data = (
            data.get("team")
            or {}
        )

        player_data = (
            data.get("player")
            or {}
        )

        return "|".join(
            [
                str(
                    time_data.get(
                        "elapsed",
                        ""
                    )
                ),
                str(
                    time_data.get(
                        "extra",
                        ""
                    )
                ),
                str(
                    team_data.get(
                        "id",
                        ""
                    )
                ),
                str(
                    player_data.get(
                        "id",
                        ""
                    )
                ),
                str(
                    data.get(
                        "type",
                        ""
                    )
                ),
                str(
                    data.get(
                        "detail",
                        ""
                    )
                ),
            ]
        )

    @staticmethod
    def _normalize_stat_name(
        value: str,
    ) -> str:

        value = (
            value
            .lower()
            .strip()
        )

        replacements = {
            "ball possession": "possession",
            "total shots": "shots",
            "shots on goal": "shots_on_target",
            "shots on target": "shots_on_target",
            "total passes": "passes",
            "pass accuracy": "passes_accuracy",
            "passes %": "passes_accuracy",
            "fouls": "fouls",
            "corner kicks": "corners",
            "offsides": "offsides",
            "yellow cards": "yellow_cards",
            "red cards": "red_cards",
        }

        return replacements.get(
            value,
            value.replace(
                " ",
                "_",
            ),
        )

    @staticmethod
    def _normalize_stat_value(
        value: Any,
    ) -> Any:

        if value is None:
            return None

        if isinstance(
            value,
            (int, float),
        ):
            return value

        value = str(
            value
        ).strip()

        if value.endswith("%"):
            return value

        try:
            return int(value)
        except ValueError:
            pass

        try:
            return float(value)
        except ValueError:
            return value

    @staticmethod
    def _clean_string(
        value: Any,
    ) -> str | None:

        if value is None:
            return None

        value = str(
            value
        ).strip()

        return value or None

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

    @staticmethod
    def _format_date(
        value: str | date,
    ) -> str:

        if isinstance(
            value,
            date,
        ):
            return value.isoformat()

        return str(
            value
        )

    @staticmethod
    def _parse_datetime(
        value: Any,
    ) -> datetime | None:

        if not value:
            return None

        if isinstance(
            value,
            datetime,
        ):
            if timezone.is_naive(
                value
            ):
                return timezone.make_aware(
                    value
                )

            return value

        value = str(
            value
        ).strip()

        try:
            parsed = datetime.fromisoformat(
                value.replace(
                    "Z",
                    "+00:00",
                )
            )

            if timezone.is_naive(
                parsed
            ):
                parsed = timezone.make_aware(
                    parsed
                )

            return parsed

        except ValueError:
            return None

def sync_matches(
    **kwargs,
) -> list[Match]:
    """
    Synchronize matches.

    Example:

        sync_matches(
            date_value="2026-08-16"
        )
    """

    service = MatchService()

    return service.sync_matches(
        **kwargs
    )


def sync_match(
    match_id: int,
) -> Match | None:
    """
    Synchronize one match.
    """

    service = MatchService()

    return service.sync_match(
        match_id
    )


def sync_match_events(
    match_id: int,
) -> list[MatchEvent]:
    """
    Synchronize match events.
    """

    service = MatchService()

    return service.sync_match_events(
        match_id
    )


def sync_match_lineups(
    match_id: int,
) -> list[MatchLineup]:
    """
    Synchronize match lineups.
    """

    service = MatchService()

    return service.sync_match_lineups(
        match_id
    )


def sync_match_statistics(
    match_id: int,
) -> list[MatchStatistic]:
    """
    Synchronize match statistics.
    """

    service = MatchService()

    return service.sync_match_statistics(
        match_id
    )