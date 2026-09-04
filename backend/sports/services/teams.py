from __future__ import annotations

from typing import Any

from django.db import transaction

from sports.models import (
    Competition,
    CompetitionSeason,
    Country,
    Team,
    TeamCompetition,
)

from sports.services.provider import (
    BaseSportsProvider,
    ProviderResponse,
    get_sports_provider,
)


class TeamServiceError(Exception):
    """Base exception for team service errors."""


class TeamService:
    """
    Synchronizes teams from the external sports provider
    into Tribe's PostgreSQL database.
    """

    def __init__(
        self,
        provider: BaseSportsProvider | None = None,
    ):
        self.provider = provider or get_sports_provider()

    def sync_teams(
        self,
        *,
        competition_id: int | None = None,
        season: int | None = None,
        country: str | None = None,
        search: str | None = None,
        team_id: int | None = None,
    ) -> list[Team]:
        """
        Synchronize teams from the provider.

        Examples:

            sync_teams(
                competition_id=39,
                season=2026,
            )

            sync_teams(
                search="Liverpool"
            )
        """

        params: dict[str, Any] = {}

        if competition_id:
            params["league"] = competition_id

        if season:
            params["season"] = season

        if country:
            params["country"] = country

        if search:
            params["search"] = search

        if team_id:
            params["id"] = team_id

        response = self.provider.get_teams(
            **params
        )

        rows = self._extract_rows(response)

        teams: list[Team] = []

        for row in rows:
            team = self._sync_team(
                row
            )

            if team:
                teams.append(team)

        # If we know the competition and season,
        # establish the relationship.
        if competition_id and season:

            competition = (
                Competition.objects.filter(
                    provider_id=competition_id
                ).first()
            )

            if competition:

                competition_season = (
                    CompetitionSeason.objects.filter(
                        competition=competition,
                        season=season,
                    ).first()
                )

                if competition_season:

                    for team in teams:
                        self._sync_team_competition(
                            team=team,
                            competition=competition,
                            season=competition_season,
                        )

        return teams

    def sync_team(
        self,
        team_id: int,
        *,
        competition_id: int | None = None,
        season: int | None = None,
    ) -> Team | None:
        """
        Synchronize one team.
        """

        params: dict[str, Any] = {}

        if competition_id:
            params["league"] = competition_id

        if season:
            params["season"] = season

        response = self.provider.get_team(
            team_id,
            **params,
        )

        rows = self._extract_rows(response)

        if not rows:
            return None

        team = self._sync_team(
            rows[0]
        )

        if (
            team
            and competition_id
            and season
        ):
            self._sync_competition_relationship(
                team=team,
                competition_id=competition_id,
                season=season,
            )

        return team

    @transaction.atomic
    def _sync_team(
        self,
        data: dict[str, Any],
    ) -> Team | None:
        """
        Convert provider team data into Tribe's Team model.
        """

        team_data = (
            data.get("team")
            or data
        )

        if not isinstance(
            team_data,
            dict,
        ):
            return None

        provider_id = self._to_int(
            team_data.get("id")
        )

        if not provider_id:
            return None

        name = self._clean_string(
            team_data.get("name")
        )

        if not name:
            return None

        short_name = self._clean_string(
            team_data.get("code")
            or team_data.get("short_name")
        )

        logo = self._clean_string(
            team_data.get("logo")
        )

        country_data = (
            team_data.get("country")
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

        venue_data = (
            data.get("venue")
            or team_data.get("venue")
            or {}
        )

        if not isinstance(
            venue_data,
            dict,
        ):
            venue_data = {}

        defaults = {
            "name": name,
            "short_name": short_name,
            "logo": logo,
            "country": country,
            "venue_name": self._clean_string(
                venue_data.get("name")
            ),
            "venue_city": self._clean_string(
                venue_data.get("city")
            ),
            "venue_capacity": self._to_int(
                venue_data.get("capacity")
            ),
            "venue_image": self._clean_string(
                venue_data.get("image")
            ),
            "provider_data": data,
        }

        team, _ = (
            Team.objects.update_or_create(
                provider_id=provider_id,
                defaults=defaults,
            )
        )

        return team

    def _sync_country(
        self,
        data: dict[str, Any],
    ) -> Country | None:
        """
        Synchronize a team's country.
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

        if code:
            country, _ = (
                Country.objects.update_or_create(
                    code=code,
                    defaults={
                        "name": name,
                        "flag": flag,
                        "provider_data": data,
                    },
                )
            )
        else:
            country, _ = (
                Country.objects.update_or_create(
                    name=name,
                    defaults={
                        "flag": flag,
                        "provider_data": data,
                    },
                )
            )

        return country

    def _sync_competition_relationship(
        self,
        *,
        team: Team,
        competition_id: int,
        season: int,
    ) -> TeamCompetition | None:
        """
        Find the local competition and season and connect
        the team to it.
        """

        competition = (
            Competition.objects.filter(
                provider_id=competition_id
            ).first()
        )

        if not competition:
            return None

        competition_season = (
            CompetitionSeason.objects.filter(
                competition=competition,
                season=season,
            ).first()
        )

        if not competition_season:
            return None

        return self._sync_team_competition(
            team=team,
            competition=competition,
            season=competition_season,
        )

    def _sync_team_competition(
        self,
        *,
        team: Team,
        competition: Competition,
        season: CompetitionSeason,
    ) -> TeamCompetition:
        """
        Create/update team participation in a competition
        season.
        """

        relationship, _ = (
            TeamCompetition.objects.update_or_create(
                team=team,
                competition=competition,
                season=season,
                defaults={
                    "provider_data": {},
                },
            )
        )

        return relationship

    @staticmethod
    def _extract_rows(
        response: ProviderResponse,
    ) -> list[dict[str, Any]]:
        """
        Normalize provider responses.

        API-Football example:

            {
                "response": [
                    {
                        "team": {...},
                        "venue": {...}
                    }
                ]
            }
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

            rows = data.get("data")

            if isinstance(rows, list):
                return [
                    row
                    for row in rows
                    if isinstance(row, dict)
                ]

            if data.get("team"):
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

def sync_teams(
    **kwargs,
) -> list[Team]:
    """
    Convenience wrapper.

    Example:

        sync_teams(
            competition_id=39,
            season=2026,
        )
    """

    service = TeamService()

    return service.sync_teams(
        **kwargs
    )


def sync_team(
    team_id: int,
    **kwargs,
) -> Team | None:
    """
    Convenience wrapper for one team.
    """

    service = TeamService()

    return service.sync_team(
        team_id,
        **kwargs,
    )