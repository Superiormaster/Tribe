from django.db import models


class Match(models.Model):
    class Status(models.TextChoices):
        TBD = "tbd", "To Be Determined"
        NOT_STARTED = "not_started", "Not Started"
        FIRST_HALF = "first_half", "First Half"
        HALF_TIME = "half_time", "Half Time"
        SECOND_HALF = "second_half", "Second Half"
        EXTRA_TIME = "extra_time", "Extra Time"
        BREAK = "break", "Break"
        PENALTY = "penalty", "Penalty Shootout"
        FINISHED = "finished", "Finished"
        POSTPONED = "postponed", "Postponed"
        SUSPENDED = "suspended", "Suspended"
        CANCELLED = "cancelled", "Cancelled"
        ABANDONED = "abandoned", "Abandoned"

    class MatchType(models.TextChoices):
        REGULAR = "regular", "Regular"
        FRIENDLY = "friendly", "Friendly"
        PLAYOFF = "playoff", "Playoff"
        SEMI_FINAL = "semi_final", "Semi Final"
        FINAL = "final", "Final"

    provider_id = models.PositiveBigIntegerField(
        unique=True,
        db_index=True,
    )

    competition = models.ForeignKey(
        "sports.Competition",
        on_delete=models.CASCADE,
        related_name="matches",
    )

    season = models.ForeignKey(
        "sports.CompetitionSeason",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches",
    )

    home_team = models.ForeignKey(
        "sports.Team",
        on_delete=models.CASCADE,
        related_name="home_matches",
    )

    away_team = models.ForeignKey(
        "sports.Team",
        on_delete=models.CASCADE,
        related_name="away_matches",
    )

    match_type = models.CharField(
        max_length=30,
        choices=MatchType.choices,
        default=MatchType.REGULAR,
    )

    round_name = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )

    group_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    venue_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
    )

    venue_city = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )

    referee = models.CharField(
        max_length=200,
        blank=True,
        null=True,
    )

    kickoff_at = models.DateTimeField(
        db_index=True,
    )

    timezone = models.CharField(
        max_length=100,
        default="UTC",
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.TBD,
        db_index=True,
    )

    status_short = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    status_long = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    elapsed_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    elapsed_extra = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    home_score = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    away_score = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    # Half-time score
    home_half_score = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    away_half_score = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    # Extra-time score
    home_extra_score = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    away_extra_score = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    # Penalty shootout score
    home_penalty_score = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    away_penalty_score = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    is_live = models.BooleanField(
        default=False,
        db_index=True,
    )

    is_finished = models.BooleanField(
        default=False,
        db_index=True,
    )

    is_postponed = models.BooleanField(
        default=False,
        db_index=True,
    )

    stream_available = models.BooleanField(
        default=False,
    )

    stream_provider = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    # ---------------------------------------------------------
    # EXTRA PROVIDER DATA
    # ---------------------------------------------------------

    # Useful for provider-specific information that we don't
    # want to create a column for immediately.
    provider_data = models.JSONField(
        default=dict,
        blank=True,
    )

    last_provider_sync = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )

    last_live_update = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["kickoff_at"]

        indexes = [
            models.Index(
                fields=[
                    "status",
                    "kickoff_at",
                ]
            ),
            models.Index(
                fields=[
                    "is_live",
                    "kickoff_at",
                ]
            ),
            models.Index(
                fields=[
                    "competition",
                    "kickoff_at",
                ]
            ),
            models.Index(
                fields=[
                    "home_team",
                    "kickoff_at",
                ]
            ),
            models.Index(
                fields=[
                    "away_team",
                    "kickoff_at",
                ]
            ),
            models.Index(
                fields=[
                    "is_finished",
                    "kickoff_at",
                ]
            ),
        ]

    def __str__(self):
        return (
            f"{self.home_team.name} "
            f"vs "
            f"{self.away_team.name}"
        )

    @property
    def score_display(self):
        """
        Returns a frontend-friendly score.
        """

        if self.home_score is None or self.away_score is None:
            return "-"

        return f"{self.home_score} - {self.away_score}"

    @property
    def is_upcoming(self):
        return (
            not self.is_live
            and not self.is_finished
            and self.status
            in {
                self.Status.TBD,
                self.Status.NOT_STARTED,
            }
        )