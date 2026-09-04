from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone

from sports.models import (
    Competition,
    CompetitionSeason,
    Country,
)

from sports.services.provider import (
    BaseSportsProvider,
    ProviderResponse,
    get_sports_provider,
)


class CompetitionServiceError(Exception):
    """Base exception for competition service errors."""


class CompetitionService:
    """
    Handles competition synchronization between the external
    sports provider and Tribe's PostgreSQL database.
    """

    def __init__(
        self,
        provider: BaseSportsProvider | None = None,
    ):
        self.provider = provider or get_sports_provider()

    def sync_competitions(
        self,
        *,
        country: str | None = None,
        search: str | None = None,
        competition_id: int | None = None,
    ) -> list[Competition]:
        """
        Fetch competitions from the provider and synchronize
        them into PostgreSQL.

        Examples:

            service.sync_competitions()

            service.sync_competitions(
                country="England"
            )

            service.sync_competitions(
                search="Premier League"
            )
        """

        params: dict[str, Any] = {}

        if country:
            params["country"] = country

        if search:
            params["search"] = search

        if competition_id:
            params["id"] = competition_id

        response = self.provider.get_competitions(
            **params
        )

        rows = self._extract_rows(response)

        competitions: list[Competition] = []

        for row in rows:
            competition = self._sync_competition(row)

            if competition:
                competitions.append(competition)

        return competitions

    def sync_competition(
        self,
        competition_id: int,
        *,
        country: str | None = None,
        season: int | None = None,
    ) -> Competition | None:
        """
        Synchronize one competition.

        Example:

            Premier League
            Champions League
            La Liga
        """

        params: dict[str, Any] = {}

        if country:
            params["country"] = country

        if season:
            params["season"] = season

        response = self.provider.get_competition(
            competition_id,
            **params,
        )

        rows = self._extract_rows(response)

        if not rows:
            return None

        return self._sync_competition(
            rows[0]
        )

    def sync_competition_season(
        self,
        competition_id: int,
        season_year: int,
    ) -> CompetitionSeason | None:
        """
        Synchronize a specific competition season.

        This is useful when importing:
            Premier League 2025/26
            Premier League 2026/27
        """

        response = self.provider.get_competition(
            competition_id,
            season=season_year,
        )

        rows = self._extract_rows(response)

        if not rows:
            return None

        competition = self._sync_competition(
            rows[0]
        )

        if not competition:
            return None

        return self._sync_season(
            competition=competition,
            data=rows[0],
            season_year=season_year,
        )

    @transaction.atomic
    def _sync_competition(
        self,
        data: dict[str, Any],
    ) -> Competition | None:
        """
        Convert provider competition data into our internal
        Competition model.
        """

        competition_data = (
            data.get("league")
            or data.get("competition")
            or data
        )

        if not isinstance(
            competition_data,
            dict,
        ):
            return None

        provider_id = self._to_int(
            competition_data.get("id")
        )

        if not provider_id:
            return None

        name = self._clean_string(
            competition_data.get("name")
        )

        if not name:
            return None

        country_data = (
            competition_data.get("country")
            or {}
        )

        if not isinstance(
            country_data,
            dict,
        ):
            country_data = {}

        country = self._sync_country(
            country_data
        )

        defaults = {
            "name": name,
            "type": self._clean_string(
                competition_data.get("type")
            ),
            "logo": self._clean_string(
                competition_data.get("logo")
            ),
            "country": country,
            "provider_data": competition_data,
        }

        competition, created = (
            Competition.objects.update_or_create(
                provider_id=provider_id,
                defaults=defaults,
            )
        )

        # Some providers return seasons together
        # with competition information.
        seasons = (
            competition_data.get("seasons")
            or []
        )

        if isinstance(seasons, list):

            for season_data in seasons:

                if not isinstance(
                    season_data,
                    dict,
                ):
                    continue

                season_year = self._to_int(
                    season_data.get("year")
                )

                if not season_year:
                    continue

                self._sync_season(
                    competition=competition,
                    data=season_data,
                    season_year=season_year,
                )

        return competition

    def _sync_country(
        self,
        data: dict[str, Any],
    ) -> Country | None:
        """
        Create/update a country.

        Provider examples:

            {
                "name": "England",
                "code": "GB",
                "flag": "..."
            }
        """

        if not data:
            return None

        name = self._clean_string(
            data.get("name")
        )

        if not name:
            return None

        code = self._clean_string(
            data.get("code")
        )

        flag = self._clean_string(
            data.get("flag")
        )

        lookup = {}

        if code:
            lookup["code"] = code
        else:
            lookup["name"] = name

        defaults = {
            "name": name,
            "flag": flag,
            "provider_data": data,
        }

        country, _ = Country.objects.update_or_create(
            defaults=defaults,
            **lookup,
        )

        return country

    def _sync_season(
        self,
        *,
        competition: Competition,
        data: dict[str, Any],
        season_year: int,
    ) -> CompetitionSeason:
        """
        Create/update one competition season.
        """

        start_date = self._parse_date(
            data.get("start")
        )

        end_date = self._parse_date(
            data.get("end")
        )

        current = bool(
            data.get("current", False)
        )

        provider_id = self._to_int(
            data.get("id")
        )

        defaults = {
            "start_date": start_date,
            "end_date": end_date,
            "current": current,
            "provider_data": data,
        }

        # If provider supplies a season ID, use it.
        if provider_id:

            season, _ = (
                CompetitionSeason.objects.update_or_create(
                    provider_id=provider_id,
                    defaults={
                        "competition": competition,
                        "season": season_year,
                        **defaults,
                    },
                )
            )

            return season

        # Fallback if provider does not provide a season ID.
        season, _ = (
            CompetitionSeason.objects.update_or_create(
                competition=competition,
                season=season_year,
                defaults=defaults,
            )
        )

        return season

    @staticmethod
    def _extract_rows(
        response: ProviderResponse,
    ) -> list[dict[str, Any]]:
        """
        Convert the provider response into a consistent list.

        API-Football normally returns:

            {
                "response": [...]
            }

        Keeping this logic here means the rest of Tribe does
        not need to know the provider's response format.
        """

        data = response.data

        if isinstance(data, dict):

            rows = data.get("response")

            if isinstance(rows, list):
                return [
                    row
                    for row in rows
                    if isinstance(row, dict)
                ]

            # Some providers may return data directly.
            if isinstance(data.get("data"), list):
                return [
                    row
                    for row in data["data"]
                    if isinstance(row, dict)
                ]

            # Single object response.
            if data.get("league") or data.get(
                "competition"
            ):
                return [data]

        if isinstance(data, list):

            return [
                row
                for row in data
                if isinstance(row, dict)
            ]

        return []

    @staticmethod
    def _clean_string(
        value: Any,
    ) -> str | None:

        if value is None:
            return None

        value = str(value).strip()

        return value or None

    @staticmethod
    def _to_int(
        value: Any,
    ) -> int | None:

        if value is None:
            return None

        try:
            return int(value)
        except (
            TypeError,
            ValueError,
        ):
            return None

    @staticmethod
    def _parse_date(
        value: Any,
    ):
        """
        Convert provider date strings into Python dates.
        """

        if not value:
            return None

        from datetime import date

        if isinstance(value, date):
            return value

        value = str(value).strip()

        try:
            return date.fromisoformat(
                value[:10]
            )
        except ValueError:
            return None

def sync_competitions(
    **kwargs,
) -> list[Competition]:
    """
    Convenience wrapper.

    Usage:

        from sports.services.competitions import (
            sync_competitions
        )

        competitions = sync_competitions()
    """

    service = CompetitionService()

    return service.sync_competitions(
        **kwargs
    )


def sync_competition(
    competition_id: int,
    **kwargs,
) -> Competition | None:
    """
    Convenience wrapper for one competition.
    """

    service = CompetitionService()

    return service.sync_competition(
        competition_id,
        **kwargs,
    )