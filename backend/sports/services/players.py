from __future__ import annotations

from typing import Any

from django.db import transaction

from sports.models import (
    Player,
    Team,
    PlayerTeam,
)

from sports.services.provider import (
    BaseSportsProvider,
    ProviderResponse,
    get_sports_provider,
)


class PlayerServiceError(Exception):
    """Base exception for player service errors."""


class PlayerService:
    """
    Synchronizes players between the external sports provider
    and Tribe's PostgreSQL database.
    """

    def __init__(
        self,
        provider: BaseSportsProvider | None = None,
    ):
        self.provider = provider or get_sports_provider()

    def sync_players(
        self,
        *,
        team_id: int | None = None,
        season: int | None = None,
        search: str | None = None,
        player_id: int | None = None,
        page: int | None = None,
    ) -> list[Player]:
        """
        Synchronize players from the provider.

        Examples:

            sync_players(
                team_id=40,
                season=2026,
            )

            sync_players(
                search="Salah"
            )
        """

        params: dict[str, Any] = {}

        if team_id:
            params["team"] = team_id

        if season:
            params["season"] = season

        if search:
            params["search"] = search

        if player_id:
            params["id"] = player_id

        if page:
            params["page"] = page

        response = self.provider.get_players(
            **params
        )

        rows = self._extract_rows(response)

        players: list[Player] = []

        for row in rows:
            player = self._sync_player(row)

            if player:
                players.append(player)

        # Establish team relationship when team/season
        # information is available.
        if team_id:
            team = Team.objects.filter(
                provider_id=team_id
            ).first()

            if team:

                for row, player in zip(
                    rows,
                    players,
                ):
                    self._sync_player_team(
                        player=player,
                        team=team,
                        season=season,
                        provider_data=row,
                    )

        return players

    def sync_player(
        self,
        player_id: int,
        *,
        season: int | None = None,
    ) -> Player | None:
        """
        Synchronize one player.
        """

        params: dict[str, Any] = {}

        if season:
            params["season"] = season

        response = self.provider.get_player(
            player_id,
            **params,
        )

        rows = self._extract_rows(response)

        if not rows:
            return None

        player = self._sync_player(
            rows[0]
        )

        if not player:
            return None

        team = self._extract_team(
            rows[0]
        )

        if team:
            local_team = Team.objects.filter(
                provider_id=team
            ).first()

            if local_team:
                self._sync_player_team(
                    player=player,
                    team=local_team,
                    season=season,
                    provider_data=rows[0],
                )

        return player

    @transaction.atomic
    def _sync_player(
        self,
        data: dict[str, Any],
    ) -> Player | None:
        """
        Convert provider player data into Tribe's Player model.
        """

        player_data = (
            data.get("player")
            or data
        )

        if not isinstance(
            player_data,
            dict,
        ):
            return None

        provider_id = self._to_int(
            player_data.get("id")
        )

        if not provider_id:
            return None

        name = self._clean_string(
            player_data.get("name")
        )

        if not name:
            return None

        first_name = self._clean_string(
            player_data.get("firstname")
            or player_data.get("first_name")
        )

        last_name = self._clean_string(
            player_data.get("lastname")
            or player_data.get("last_name")
        )

        common_name = self._clean_string(
            player_data.get("common_name")
        )

        nationality = self._clean_string(
            player_data.get("nationality")
        )

        birth_data = (
            player_data.get("birth")
            or {}
        )

        if not isinstance(
            birth_data,
            dict,
        ):
            birth_data = {}

        birth_date = self._parse_date(
            birth_data.get("date")
        )

        birth_place = self._clean_string(
            birth_data.get("place")
        )

        birth_country = self._clean_string(
            birth_data.get("country")
        )

        height = self._clean_string(
            player_data.get("height")
        )

        weight = self._clean_string(
            player_data.get("weight")
        )

        position = self._clean_string(
            player_data.get("position")
        )

        number = self._to_int(
            player_data.get("number")
        )

        photo = self._clean_string(
            player_data.get("photo")
        )

        injured = bool(
            player_data.get("injured", False)
        )

        defaults = {
            "name": name,
            "first_name": first_name,
            "last_name": last_name,
            "common_name": common_name,
            "nationality": nationality,
            "birth_date": birth_date,
            "birth_place": birth_place,
            "birth_country": birth_country,
            "height": height,
            "weight": weight,
            "position": position,
            "number": number,
            "photo": photo,
            "injured": injured,
            "provider_data": data,
        }

        player, _ = (
            Player.objects.update_or_create(
                provider_id=provider_id,
                defaults=defaults,
            )
        )

        return player

    @transaction.atomic
    def _sync_player_team(
        self,
        *,
        player: Player,
        team: Team,
        season: int | None,
        provider_data: dict[str, Any],
    ) -> PlayerTeam:
        """
        Connect a player with a team.

        We keep this relationship separate from Player because
        a player can belong to multiple teams across different
        seasons.
        """

        defaults = {
            "season": season,
            "provider_data": provider_data,
        }

        relationship, _ = (
            PlayerTeam.objects.update_or_create(
                player=player,
                team=team,
                season=season,
                defaults=defaults,
            )
        )

        return relationship

    @staticmethod
    def _extract_team(
        data: dict[str, Any],
    ) -> int | None:
        """
        Extract provider team ID from a player response.

        API-Football may return player/team information in
        different structures, so we handle the common forms.
        """

        statistics = data.get(
            "statistics"
        )

        if isinstance(
            statistics,
            list,
        ) and statistics:

            first = statistics[0]

            if isinstance(
                first,
                dict,
            ):
                team = first.get("team")

                if isinstance(
                    team,
                    dict,
                ):
                    return PlayerService._to_int(
                        team.get("id")
                    )

        team = data.get("team")

        if isinstance(
            team,
            dict,
        ):
            return PlayerService._to_int(
                team.get("id")
            )

        player = data.get("player")

        if isinstance(
            player,
            dict,
        ):
            team = player.get("team")

            if isinstance(
                team,
                dict,
            ):
                return PlayerService._to_int(
                    team.get("id")
                )

        return None

    @staticmethod
    def _extract_rows(
        response: ProviderResponse,
    ) -> list[dict[str, Any]]:
        """
        Normalize provider responses.

        API-Football commonly returns:

            {
                "response": [
                    {
                        "player": {...},
                        "statistics": [...]
                    }
                ]
            }
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

            if data.get("player"):
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
        if not value:
            return None

        from datetime import date

        if isinstance(
            value,
            date,
        ):
            return value

        value = str(
            value
        ).strip()

        try:
            return date.fromisoformat(
                value[:10]
            )

        except ValueError:
            return None

def sync_players(
    **kwargs,
) -> list[Player]:
    """
    Convenience wrapper.

    Example:

        sync_players(
            team_id=40,
            season=2026,
        )
    """

    service = PlayerService()

    return service.sync_players(
        **kwargs
    )


def sync_player(
    player_id: int,
    **kwargs,
) -> Player | None:
    """
    Convenience wrapper for one player.
    """

    service = PlayerService()

    return service.sync_player(
        player_id,
        **kwargs,
    )