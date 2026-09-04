from __future__ import annotations

from typing import Any

from django.db import transaction

from sports.models import (
    Competition,
    CompetitionSeason,
    Standing,
    Team,
)

from sports.services.provider import (
    BaseSportsProvider,
    ProviderResponse,
    get_sports_provider,
)


class StandingServiceError(Exception):
    """Base exception for standings service errors."""


class StandingService:
    """
    Synchronizes competition standings from the sports provider.

    Provider
        ↓
    StandingService
        ↓
    PostgreSQL
        ↓
    Tribe API
        ↓
    LeagueTable.tsx
    """

    def __init__(
        self,
        provider: BaseSportsProvider | None = None,
    ):
        self.provider = provider or get_sports_provider()

    def sync_standings(
        self,
        *,
        competition_id: int,
        season: int,
    ) -> list[Standing]:
        """
        Synchronize standings for a competition and season.

        Example:

            sync_standings(
                competition_id=39,
                season=2026,
            )
        """

        competition = Competition.objects.filter(
            provider_id=competition_id
        ).first()

        if not competition:
            raise StandingServiceError(
                f"Competition {competition_id} "
                "does not exist locally."
            )

        competition_season = (
            CompetitionSeason.objects.filter(
                competition=competition,
                season=season,
            ).first()
        )

        if not competition_season:
            raise StandingServiceError(
                f"Season {season} does not exist "
                f"for competition {competition_id}."
            )

        response = self.provider.get_standings(
            league=competition_id,
            season=season,
        )

        rows = self._extract_rows(
            response
        )

        standings: list[Standing] = []

        for row in rows:
            synced = self._sync_group(
                competition=competition,
                season=competition_season,
                row=row,
            )

            standings.extend(
                synced
            )

        return standings

    @transaction.atomic
    def _sync_group(
        self,
        *,
        competition: Competition,
        season: CompetitionSeason,
        row: dict[str, Any],
    ) -> list[Standing]:
        """
        A provider may return:

        [
            {
                "league": {...},
                "standings": [
                    [...]
                ]
            }
        ]

        There can also be multiple groups:

            Group A
            Group B

        or multiple phases.
        """

        standings_data = row.get(
            "standings"
        )

        if not isinstance(
            standings_data,
            list,
        ):
            return []

        results: list[Standing] = []

        # API-Football commonly wraps each table
        # inside another list:
        #
        # standings = [
        #     [
        #         {...},
        #         {...}
        #     ]
        # ]

        groups: list[list[dict[str, Any]]] = []

        if standings_data:

            if all(
                isinstance(
                    item,
                    dict,
                )
                for item in standings_data
            ):
                groups.append(
                    standings_data
                )

            else:

                for group in standings_data:

                    if isinstance(
                        group,
                        list,
                    ):
                        groups.append(
                            [
                                item
                                for item in group
                                if isinstance(
                                    item,
                                    dict,
                                )
                            ]
                        )

        for group_index, group in enumerate(
            groups,
            start=1,
        ):

            group_name = self._extract_group_name(
                group
            )

            for item in group:

                standing = (
                    self._sync_standing(
                        competition=competition,
                        season=season,
                        data=item,
                        group_index=group_index,
                        group_name=group_name,
                    )
                )

                if standing:
                    results.append(
                        standing
                    )

        return results

    @transaction.atomic
    def _sync_standing(
        self,
        *,
        competition: Competition,
        season: CompetitionSeason,
        data: dict[str, Any],
        group_index: int,
        group_name: str | None,
    ) -> Standing | None:
        """
        Synchronize one team's position.
        """

        team_data = (
            data.get("team")
            or {}
        )

        if not isinstance(
            team_data,
            dict,
        ):
            return None

        provider_team_id = self._to_int(
            team_data.get("id")
        )

        if not provider_team_id:
            return None

        team = Team.objects.filter(
            provider_id=provider_team_id
        ).first()

        if not team:
            # Do not create incomplete teams here.
            # TeamService is responsible for that.
            return None

        rank = self._to_int(
            data.get("rank")
        )

        if not rank:
            return None

        all_played = (
            data.get("all")
            or {}
        )

        home_played = (
            data.get("home")
            or {}
        )

        away_played = (
            data.get("away")
            or {}
        )

        if not isinstance(
            all_played,
            dict,
        ):
            all_played = {}

        if not isinstance(
            home_played,
            dict,
        ):
            home_played = {}

        if not isinstance(
            away_played,
            dict,
        ):
            away_played = {}

        description = self._clean_string(
            data.get("description")
        )

        form = self._clean_string(
            data.get("form")
        )

        played = self._to_int(
            all_played.get("played")
        )

        wins = self._to_int(
            all_played.get("win")
        )

        draws = self._to_int(
            all_played.get("draw")
        )

        losses = self._to_int(
            all_played.get("lose")
        )

        goals_for = self._to_int(
            all_played.get("goals", {}).get(
                "for"
            )
            if isinstance(
                all_played.get("goals"),
                dict,
            )
            else None
        )

        goals_against = self._to_int(
            all_played.get("goals", {}).get(
                "against"
            )
            if isinstance(
                all_played.get("goals"),
                dict,
            )
            else None
        )

        goal_difference = None

        if (
            goals_for is not None
            and goals_against is not None
        ):
            goal_difference = (
                goals_for
                - goals_against
            )

        points = self._to_int(
            data.get("points")
        )

        goals_for_home = self._extract_goal_value(
            home_played,
            "for",
        )

        goals_against_home = (
            self._extract_goal_value(
                home_played,
                "against",
            )
        )

        goals_for_away = (
            self._extract_goal_value(
                away_played,
                "for",
            )
        )

        goals_against_away = (
            self._extract_goal_value(
                away_played,
                "against",
            )
        )

        defaults = {
            "rank": rank,
            "team": team,

            "played": played or 0,
            "wins": wins or 0,
            "draws": draws or 0,
            "losses": losses or 0,

            "goals_for": goals_for or 0,
            "goals_against": goals_against or 0,
            "goal_difference": (
                goal_difference or 0
            ),

            "points": points or 0,

            "home_played": self._to_int(
                home_played.get("played")
            ) or 0,

            "home_wins": self._to_int(
                home_played.get("win")
            ) or 0,

            "home_draws": self._to_int(
                home_played.get("draw")
            ) or 0,

            "home_losses": self._to_int(
                home_played.get("lose")
            ) or 0,

            "away_played": self._to_int(
                away_played.get("played")
            ) or 0,

            "away_wins": self._to_int(
                away_played.get("win")
            ) or 0,

            "away_draws": self._to_int(
                away_played.get("draw")
            ) or 0,

            "away_losses": self._to_int(
                away_played.get("lose")
            ) or 0,

            "goals_for_home": (
                goals_for_home or 0
            ),

            "goals_against_home": (
                goals_against_home or 0
            ),

            "goals_for_away": (
                goals_for_away or 0
            ),

            "goals_against_away": (
                goals_against_away or 0
            ),

            "form": form,
            "description": description,
            "group_name": group_name,
            "group_index": group_index,

            "provider_data": data,
        }

        standing, _ = (
            Standing.objects.update_or_create(
                competition=competition,
                season=season,
                team=team,
                group_index=group_index,
                defaults=defaults,
            )
        )

        return standing

    def get_standings(
        self,
        *,
        competition_id: int,
        season: int,
        group_index: int | None = None,
    ):
        """
        Read standings from PostgreSQL.

        This method DOES NOT call the external API.

        This is what your API view should normally use.
        """

        queryset = (
            Standing.objects
            .filter(
                competition__provider_id=(
                    competition_id
                ),
                season__season=season,
            )
            .select_related(
                "team",
                "competition",
                "season",
            )
            .order_by(
                "group_index",
                "rank",
            )
        )

        if group_index is not None:
            queryset = queryset.filter(
                group_index=group_index
            )

        return queryset

    def get_team_position(
        self,
        *,
        competition_id: int,
        season: int,
        team_id: int,
    ) -> Standing | None:
        """
        Return one team's current position.
        """

        return (
            Standing.objects
            .filter(
                competition__provider_id=(
                    competition_id
                ),
                season__season=season,
                team__provider_id=team_id,
            )
            .select_related(
                "team",
                "competition",
                "season",
            )
            .order_by(
                "group_index",
                "rank",
            )
            .first()
        )

    def cleanup_old_groups(
        self,
        *,
        competition_id: int,
        season: int,
    ) -> int:
        """
        Remove standings that no longer appear
        in the current provider response.

        Normally you won't need to call this every time.
        It can be used during a full synchronization.
        """

        queryset = Standing.objects.filter(
            competition__provider_id=(
                competition_id
            ),
            season__season=season,
        )

        count = queryset.count()

        queryset.delete()

        return count

    @staticmethod
    def _extract_rows(
        response: ProviderResponse,
    ) -> list[dict[str, Any]]:
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
    def _extract_group_name(
        group: list[dict[str, Any]],
    ) -> str | None:

        for item in group:

            group_data = item.get(
                "group"
            )

            if isinstance(
                group_data,
                str,
            ):
                return group_data

            if isinstance(
                group_data,
                dict,
            ):

                name = (
                    group_data.get(
                        "name"
                    )
                )

                if name:
                    return str(
                        name
                    )

        return None

    @staticmethod
    def _extract_goal_value(
        data: dict[str, Any],
        key: str,
    ) -> int | None:

        goals = data.get(
            "goals"
        )

        if not isinstance(
            goals,
            dict,
        ):
            return None

        return StandingService._to_int(
            goals.get(key)
        )

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

def sync_standings(
    *,
    competition_id: int,
    season: int,
) -> list[Standing]:
    """
    Synchronize a competition table.
    """

    service = StandingService()

    return service.sync_standings(
        competition_id=competition_id,
        season=season,
    )


def get_standings(
    *,
    competition_id: int,
    season: int,
    group_index: int | None = None,
):
    """
    Read the cached/database version of the table.
    """

    service = StandingService()

    return service.get_standings(
        competition_id=competition_id,
        season=season,
        group_index=group_index,
    )


def get_team_position(
    *,
    competition_id: int,
    season: int,
    team_id: int,
) -> Standing | None:
    """
    Get a team's current league position.
    """

    service = StandingService()

    return service.get_team_position(
        competition_id=competition_id,
        season=season,
        team_id=team_id,
    )