from __future__ import annotations

from celery import shared_task
from django.utils import timezone


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_today_matches(self):
    """
    Synchronize today's fixtures/results.

    This does NOT continuously poll the provider.
    Run it periodically, for example every 30-60 minutes.
    """

    from sports.services.matches import MatchService

    today = timezone.localdate()

    service = MatchService()

    matches = service.sync_matches(
        date_value=today,
    )

    return {
        "date": str(today),
        "matches": len(matches),
    }

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_upcoming_matches(
    self,
    days: int = 7,
):
    """
    Synchronize upcoming fixtures.

    This can run once or twice per day because fixtures
    don't change every few seconds.
    """

    from datetime import timedelta

    from sports.services.matches import MatchService

    today = timezone.localdate()

    end_date = (
        today
        + timedelta(days=days)
    )

    service = MatchService()

    matches = service.sync_matches(
        from_date=today,
        to_date=end_date,
    )

    return {
        "from": str(today),
        "to": str(end_date),
        "matches": len(matches),
    }

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_recent_results(
    self,
):
    """
    Synchronize recent results.

    Finished matches don't need frequent polling.
    """

    from datetime import timedelta

    from sports.services.matches import MatchService

    today = timezone.localdate()

    start_date = (
        today
        - timedelta(days=2)
    )

    service = MatchService()

    matches = service.sync_matches(
        from_date=start_date,
        to_date=today,
    )

    return {
        "from": str(start_date),
        "to": str(today),
        "matches": len(matches),
    }

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_live_matches(self):
    """
    Synchronize currently live matches in batches.

    This task is demand-driven.
    It should be triggered only when live monitoring is active.
    """

    from sports.services.live import LiveMatchService

    service = LiveMatchService()

    if not service.provider.can_make_request(
        priority="live"
    ):
        return {
            "matches": 0,
            "provider_requests": 0,
            "skipped": "quota",
        }

    matches = service.sync_live_matches()

    return {
        "matches": len(matches),
        "provider_requests": service.provider_requests,
        "updated_at": timezone.now().isoformat(),
    }

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

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_live_match_details(
    self,
    match_id: int,
):
    """
    Synchronize events, lineups and statistics
    for one live match.

    This is intentionally separate from the general
    live-match score synchronization.
    """

    from sports.services.live import (
        LiveMatchService,
    )

    service = LiveMatchService()

    data = service.sync_live_details(
        match_id
    )

    return {
        "match_id": match_id,
        "events": len(
            data.get("events", [])
        ),
        "lineups": len(
            data.get("lineups", [])
        ),
        "statistics": len(
            data.get("statistics", [])
        ),
    }

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def cleanup_stale_live_matches(
    self,
):
    """
    Make sure matches that stopped receiving updates
    are no longer marked as live.
    """

    from sports.services.live import (
        LiveMatchService,
    )

    service = LiveMatchService()

    cleaned = (
        service.cleanup_stale_live_matches(
            max_age_minutes=20
        )
    )

    return {
        "cleaned": cleaned,
    }

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_competition_standings(
    self,
    competition_id: int,
    season: int,
):
    """
    Synchronize one competition table.

    Example:

        sync_competition_standings.delay(
            competition_id=39,
            season=2026,
        )
    """

    from sports.services.standings import (
        StandingService,
    )

    service = StandingService()

    standings = service.sync_standings(
        competition_id=competition_id,
        season=season,
    )

    return {
        "competition_id": competition_id,
        "season": season,
        "standings": len(standings),
    }

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_team_players(
    self,
    team_id: int,
    season: int,
):
    """
    Synchronize players for a team.

    Players don't change frequently, so this should run
    much less frequently than live match synchronization.
    """

    from sports.services.players import (
        PlayerService,
    )

    service = PlayerService()

    players = service.sync_players(
        team_id=team_id,
        season=season,
    )

    return {
        "team_id": team_id,
        "season": season,
        "players": len(players),
    }

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_player(
    self,
    player_id: int,
    season: int | None = None,
):
    """
    Synchronize one player.
    """

    from sports.services.players import (
        PlayerService,
    )

    service = PlayerService()

    player = service.sync_player(
        player_id,
        season=season,
    )

    return {
        "player_id": player_id,
        "synced": player is not None,
    }