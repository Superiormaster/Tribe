from django.db import models


class SportsCacheEntry(models.Model):
    """
    Persistent cache metadata for sports-provider data.

    Redis should be used for the actual high-speed cache.

    This model tells us:
        - what was cached
        - where it came from
        - when it was fetched
        - when it expires
        - whether it needs refreshing
    """

    class CacheType(models.TextChoices):
        MATCHES = "matches", "Matches"
        LIVE_MATCHES = "live_matches", "Live Matches"
        MATCH = "match", "Match"
        EVENTS = "events", "Match Events"
        LINEUPS = "lineups", "Lineups"
        STATISTICS = "statistics", "Statistics"
        STANDINGS = "standings", "Standings"
        TEAMS = "teams", "Teams"
        TEAM = "team", "Team"
        PLAYERS = "players", "Players"
        PLAYER = "player", "Player"
        COMPETITIONS = "competitions", "Competitions"
        COMPETITION = "competition", "Competition"
        NEWS = "news", "Sports News"

    cache_key = models.CharField(
        max_length=500,
        unique=True,
        db_index=True,
    )

    cache_type = models.CharField(
        max_length=50,
        choices=CacheType.choices,
        db_index=True,
    )

    provider = models.CharField(
        max_length=100,
        db_index=True,
    )

    competition_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    team_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    match_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    player_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    season = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    fetched_at = models.DateTimeField(
        db_index=True,
    )

    expires_at = models.DateTimeField(
        db_index=True,
    )

    last_hit_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Number of times the cache was successfully served.
    hit_count = models.PositiveBigIntegerField(
        default=0,
    )

    endpoint = models.CharField(
        max_length=500,
        blank=True,
        null=True,
    )

    request_params = models.JSONField(
        default=dict,
        blank=True,
    )

    response_hash = models.CharField(
        max_length=128,
        blank=True,
        null=True,
    )

    is_valid = models.BooleanField(
        default=True,
        db_index=True,
    )

    refresh_required = models.BooleanField(
        default=False,
        db_index=True,
    )

    # Number of provider requests that failed while
    # refreshing this cache.
    refresh_failures = models.PositiveIntegerField(
        default=0,
    )

    last_refresh_error = models.TextField(
        blank=True,
        null=True,
    )

    snapshot = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-updated_at"]

        indexes = [
            models.Index(
                fields=[
                    "cache_type",
                    "expires_at",
                ]
            ),
            models.Index(
                fields=[
                    "provider",
                    "cache_type",
                ]
            ),
            models.Index(
                fields=[
                    "refresh_required",
                    "expires_at",
                ]
            ),
            models.Index(
                fields=[
                    "match_id",
                    "cache_type",
                ]
            ),
            models.Index(
                fields=[
                    "competition_id",
                    "season",
                    "cache_type",
                ]
            ),
        ]

    def __str__(self):
        return self.cache_key

    @property
    def is_expired(self):
        from django.utils import timezone

        return timezone.now() >= self.expires_at