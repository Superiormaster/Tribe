from __future__ import annotations

import json
from typing import Any

from django.core.cache import cache


class SportsCache:
    """
    Redis cache helper for Tribe Sports.

    PostgreSQL remains the source of truth.
    Redis only reduces database/provider load.
    """

    PREFIX = "sports"
    TTL_LIVE = 45
    TTL_LIVE_EVENTS = 45
    TTL_LIVE_STATS = 60
    TTL_LIVE_LINEUPS = 5 * 60
    TTL_TODAY = 10 * 60
    TTL_FIXTURES = 60 * 60
    TTL_RESULTS = 60 * 60
    TTL_MATCH = 5 * 60
    TTL_COMPETITION = 24 * 60 * 60
    TTL_STANDINGS = 30 * 60
    TTL_TEAM = 24 * 60 * 60
    TTL_TEAM_MATCHES = 30 * 60
    TTL_TEAM_PLAYERS = 6 * 60 * 60
    TTL_PLAYER = 24 * 60 * 60
    TTL_PROVIDER_QUOTA = 60 * 60
    TTL_LIVE_MONITOR = 90

    @classmethod
    def key(
        cls,
        *parts: Any,
    ) -> str:
        """
        Example:

            SportsCache.key(
                "match",
                123,
                "events",
            )

        becomes:

            sports:match:123:events
        """

        values = [
            str(part)
            for part in parts
            if part is not None
        ]

        return ":".join(
            [cls.PREFIX, *values]
        )

    @classmethod
    def get(
        cls,
        key: str,
        default=None,
    ):
        return cache.get(
            key,
            default,
        )

    @classmethod
    def set(
        cls,
        key: str,
        value: Any,
        timeout: int | None = None,
    ):
        cache.set(
            key,
            value,
            timeout=timeout,
        )

    @classmethod
    def delete(
        cls,
        key: str,
    ):
        cache.delete(key)

    @classmethod
    def delete_many(
        cls,
        keys: list[str],
    ):
        if not keys:
            return

        cache.delete_many(keys)

    @classmethod
    def get_json(
        cls,
        key: str,
        default=None,
    ):
        value = cache.get(key)

        if value is None:
            return default

        if isinstance(
            value,
            (dict, list),
        ):
            return value

        try:
            return json.loads(value)

        except (
            TypeError,
            ValueError,
            json.JSONDecodeError,
        ):
            return default

    @classmethod
    def set_json(
        cls,
        key: str,
        value: Any,
        timeout: int | None = None,
    ):
        cache.set(
            key,
            json.dumps(
                value,
                default=str,
            ),
            timeout=timeout,
        )

    @classmethod
    def live_monitor_key(
        cls,
        match_id: int,
    ) -> str:
        return cls.key(
            "live",
            "monitor",
            match_id,
        )
  
    @classmethod
    def mark_live_monitor(
        cls,
        match_id: int,
    ):
        cls.set(
            cls.live_monitor_key(match_id),
            True,
            cls.TTL_LIVE_MONITOR,
        )

    @classmethod
    def is_live_monitor_active(
        cls,
        match_id: int,
    ) -> bool:
        return bool(
            cls.get(
                cls.live_monitor_key(match_id)
            )
        )

    @classmethod
    def live_matches_key(
        cls,
    ) -> str:
        return cls.key(
            "matches",
            "live",
        )

    @classmethod
    def get_live_matches(
        cls,
    ):
        return cls.get_json(
            cls.live_matches_key()
        )

    @classmethod
    def set_live_matches(
        cls,
        matches: Any,
    ):
        cls.set_json(
            cls.live_matches_key(),
            matches,
            cls.TTL_LIVE,
        )

    @classmethod
    def clear_live_matches(
        cls,
    ):
        cls.delete(
            cls.live_matches_key()
        )

    @classmethod
    def today_matches_key(
        cls,
        date: str,
    ) -> str:
        return cls.key(
            "matches",
            "today",
            date,
        )

    @classmethod
    def get_today_matches(
        cls,
        date: str,
    ):
        return cls.get_json(
            cls.today_matches_key(
                date
            )
        )

    @classmethod
    def set_today_matches(
        cls,
        date: str,
        matches: Any,
    ):
        cls.set_json(
            cls.today_matches_key(
                date
            ),
            matches,
            cls.TTL_TODAY,
        )

    @classmethod
    def fixtures_key(
        cls,
        date: str | None = None,
        competition_id: int | None = None,
        page: int | None = None,
    ) -> str:

        return cls.key(
            "fixtures",
            date or "all",
            competition_id or "all",
            page or 1,
        )

    @classmethod
    def get_fixtures(
        cls,
        date: str | None = None,
        competition_id: int | None = None,
        page: int | None = None,
    ):
        return cls.get_json(
            cls.fixtures_key(
                date,
                competition_id,
                page,
            )
        )

    @classmethod
    def set_fixtures(
        cls,
        fixtures: Any,
        date: str | None = None,
        competition_id: int | None = None,
        page: int | None = None,
    ):
        cls.set_json(
            cls.fixtures_key(
                date,
                competition_id,
                page,
            ),
            fixtures,
            cls.TTL_FIXTURES,
        )

    @classmethod
    def results_key(
        cls,
        date: str | None = None,
        competition_id: int | None = None,
        page: int | None = None,
    ) -> str:

        return cls.key(
            "results",
            date or "all",
            competition_id or "all",
            page or 1,
        )

    @classmethod
    def get_results(
        cls,
        date: str | None = None,
        competition_id: int | None = None,
        page: int | None = None,
    ):
        return cls.get_json(
            cls.results_key(
                date,
                competition_id,
                page,
            )
        )

    @classmethod
    def set_results(
        cls,
        results: Any,
        date: str | None = None,
        competition_id: int | None = None,
        page: int | None = None,
    ):
        cls.set_json(
            cls.results_key(
                date,
                competition_id,
                page,
            ),
            results,
            cls.TTL_RESULTS,
        )

    @classmethod
    def match_key(
        cls,
        match_id: int,
    ) -> str:
        return cls.key(
            "match",
            match_id,
        )

    @classmethod
    def get_match(
        cls,
        match_id: int,
    ):
        return cls.get_json(
            cls.match_key(
                match_id
            )
        )

    @classmethod
    def set_match(
        cls,
        match_id: int,
        match: Any,
        timeout: int | None = None,
    ):
        cls.set_json(
            cls.match_key(
                match_id
            ),
            match,
            timeout or cls.TTL_MATCH,
        )

    @classmethod
    def match_events_key(
        cls,
        match_id: int,
    ) -> str:
        return cls.key(
            "match",
            match_id,
            "events",
        )

    @classmethod
    def get_match_events(
        cls,
        match_id: int,
    ):
        return cls.get_json(
            cls.match_events_key(
                match_id
            )
        )

    @classmethod
    def set_match_events(
        cls,
        match_id: int,
        events: Any,
    ):
        cls.set_json(
            cls.match_events_key(
                match_id
            ),
            events,
            cls.TTL_LIVE_EVENTS,
        )

    @classmethod
    def match_stats_key(
        cls,
        match_id: int,
    ) -> str:
        return cls.key(
            "match",
            match_id,
            "stats",
        )

    @classmethod
    def get_match_stats(
        cls,
        match_id: int,
    ):
        return cls.get_json(
            cls.match_stats_key(
                match_id
            )
        )

    @classmethod
    def set_match_stats(
        cls,
        match_id: int,
        stats: Any,
    ):
        cls.set_json(
            cls.match_stats_key(
                match_id
            ),
            stats,
            cls.TTL_LIVE_STATS,
        )

    @classmethod
    def match_lineups_key(
        cls,
        match_id: int,
    ) -> str:
        return cls.key(
            "match",
            match_id,
            "lineups",
        )

    @classmethod
    def get_match_lineups(
        cls,
        match_id: int,
    ):
        return cls.get_json(
            cls.match_lineups_key(
                match_id
            )
        )

    @classmethod
    def set_match_lineups(
        cls,
        match_id: int,
        lineups: Any,
    ):
        cls.set_json(
            cls.match_lineups_key(
                match_id
            ),
            lineups,
            cls.TTL_LIVE_LINEUPS,
        )

    @classmethod
    def competition_key(
        cls,
        competition_id: int,
    ) -> str:
        return cls.key(
            "competition",
            competition_id,
        )

    @classmethod
    def get_competition(
        cls,
        competition_id: int,
    ):
        return cls.get_json(
            cls.competition_key(
                competition_id
            )
        )

    @classmethod
    def set_competition(
        cls,
        competition_id: int,
        competition: Any,
    ):
        cls.set_json(
            cls.competition_key(
                competition_id
            ),
            competition,
            cls.TTL_COMPETITION,
        )

    @classmethod
    def standings_key(
        cls,
        competition_id: int,
        season: int,
        group: int | None = None,
    ) -> str:

        return cls.key(
            "competition",
            competition_id,
            "standings",
            season,
            group or "all",
        )

    @classmethod
    def get_standings(
        cls,
        competition_id: int,
        season: int,
        group: int | None = None,
    ):
        return cls.get_json(
            cls.standings_key(
                competition_id,
                season,
                group,
            )
        )

    @classmethod
    def set_standings(
        cls,
        competition_id: int,
        season: int,
        standings: Any,
        group: int | None = None,
    ):
        cls.set_json(
            cls.standings_key(
                competition_id,
                season,
                group,
            ),
            standings,
            cls.TTL_STANDINGS,
        )

    @classmethod
    def team_key(
        cls,
        team_id: int,
    ) -> str:
        return cls.key(
            "team",
            team_id,
        )

    @classmethod
    def get_team(
        cls,
        team_id: int,
    ):
        return cls.get_json(
            cls.team_key(
                team_id
            )
        )

    @classmethod
    def set_team(
        cls,
        team_id: int,
        team: Any,
    ):
        cls.set_json(
            cls.team_key(
                team_id
            ),
            team,
            cls.TTL_TEAM,
        )

    @classmethod
    def team_matches_key(
        cls,
        team_id: int,
        page: int = 1,
    ) -> str:
        return cls.key(
            "team",
            team_id,
            "matches",
            page,
        )

    @classmethod
    def get_team_matches(
        cls,
        team_id: int,
        page: int = 1,
    ):
        return cls.get_json(
            cls.team_matches_key(
                team_id,
                page,
            )
        )

    @classmethod
    def set_team_matches(
        cls,
        team_id: int,
        matches: Any,
        page: int = 1,
    ):
        cls.set_json(
            cls.team_matches_key(
                team_id,
                page,
            ),
            matches,
            cls.TTL_TEAM_MATCHES,
        )

    @classmethod
    def team_players_key(
        cls,
        team_id: int,
        season: int | None = None,
    ) -> str:

        return cls.key(
            "team",
            team_id,
            "players",
            season or "current",
        )

    @classmethod
    def get_team_players(
        cls,
        team_id: int,
        season: int | None = None,
    ):
        return cls.get_json(
            cls.team_players_key(
                team_id,
                season,
            )
        )

    @classmethod
    def set_team_players(
        cls,
        team_id: int,
        players: Any,
        season: int | None = None,
    ):
        cls.set_json(
            cls.team_players_key(
                team_id,
                season,
            ),
            players,
            cls.TTL_TEAM_PLAYERS,
        )

    @classmethod
    def player_key(
        cls,
        player_id: int,
    ) -> str:
        return cls.key(
            "player",
            player_id,
        )

    @classmethod
    def get_player(
        cls,
        player_id: int,
    ):
        return cls.get_json(
            cls.player_key(
                player_id
            )
        )

    @classmethod
    def set_player(
        cls,
        player_id: int,
        player: Any,
    ):
        cls.set_json(
            cls.player_key(
                player_id
            ),
            player,
            cls.TTL_PLAYER,
        )

    @classmethod
    def provider_quota_key(cls) -> str:
        return cls.key(
            "provider",
            "quota",
        )
  
    @classmethod
    def get_provider_quota(cls):
        return cls.get_json(
            cls.provider_quota_key()
        )
  
    @classmethod
    def set_provider_quota(
        cls,
        remaining: int | None,
        limit: int | None,
        minute_remaining: int | None = None,
        minute_limit: int | None = None,
    ):
        cls.set_json(
            cls.provider_quota_key(),
            {
                "remaining": remaining,
                "limit": limit,
                "minute_remaining": minute_remaining,
                "minute_limit": minute_limit,
            },
            cls.TTL_PROVIDER_QUOTA,
        )
  
    @classmethod
    def invalidate_match(
        cls,
        match_id: int,
    ):
        """
        Clear all cached information belonging to
        one match.
        """

        cls.delete_many(
            [
                cls.match_key(
                    match_id
                ),
                cls.match_events_key(
                    match_id
                ),
                cls.match_stats_key(
                    match_id
                ),
                cls.match_lineups_key(
                    match_id
                ),
            ]
        )

    @classmethod
    def invalidate_team(
        cls,
        team_id: int,
    ):
        """
        Clear team-related caches.
        """

        cls.delete_many(
            [
                cls.team_key(
                    team_id
                ),
                cls.team_matches_key(
                    team_id
                ),
                cls.team_players_key(
                    team_id
                ),
            ]
        )

    @classmethod
    def invalidate_competition(
        cls,
        competition_id: int,
        season: int | None = None,
    ):
        keys = [
            cls.competition_key(
                competition_id
            )
        ]

        if season is not None:
            keys.append(
                cls.standings_key(
                    competition_id,
                    season,
                )
            )

        cls.delete_many(keys)