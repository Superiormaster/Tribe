from django.db import models


class Standing(models.Model):
    """
    One team's position in a competition table for a season.

    Example:

    Premier League 2026/27

    1. Liverpool
    2. Arsenal
    3. Chelsea
    ...
    """

    competition = models.ForeignKey(
        "sports.Competition",
        on_delete=models.CASCADE,
        related_name="standings",
    )

    season = models.ForeignKey(
        "sports.CompetitionSeason",
        on_delete=models.CASCADE,
        related_name="standings",
    )

    team = models.ForeignKey(
        "sports.Team",
        on_delete=models.CASCADE,
        related_name="standings",
    )

    rank = models.PositiveIntegerField(
        db_index=True,
    )

    group_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    played = models.PositiveIntegerField(
        default=0,
    )

    wins = models.PositiveIntegerField(
        default=0,
    )

    draws = models.PositiveIntegerField(
        default=0,
    )

    losses = models.PositiveIntegerField(
        default=0,
    )

    goals_for = models.IntegerField(
        default=0,
    )

    goals_against = models.IntegerField(
        default=0,
    )

    goal_difference = models.IntegerField(
        default=0,
    )

    points = models.IntegerField(
        default=0,
        db_index=True,
    )

    form = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=(
            "Example: Champions League, Relegation, "
            "Promotion, etc."
        ),
    )

    provider_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    provider_data = models.JSONField(
        default=dict,
        blank=True,
    )

    last_provider_sync = models.DateTimeField(
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
        ordering = [
            "rank",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "competition",
                    "season",
                    "team",
                    "group_name",
                ],
                name="unique_competition_season_team_group",
            )
        ]

        indexes = [
            models.Index(
                fields=[
                    "competition",
                    "season",
                    "rank",
                ]
            ),
            models.Index(
                fields=[
                    "competition",
                    "season",
                    "points",
                ]
            ),
            models.Index(
                fields=[
                    "team",
                    "season",
                ]
            ),
        ]

    def __str__(self):
        return (
            f"{self.rank}. "
            f"{self.team.name} - "
            f"{self.points} pts"
        )

    @property
    def record(self):
        """
        Returns a simple W-D-L record.

        Example:
        15-4-3
        """

        return (
            f"{self.wins}-"
            f"{self.draws}-"
            f"{self.losses}"
        )

    @property
    def goal_difference_display(self):
        """
        Returns +10, -3 or 0.
        """

        if self.goal_difference > 0:
            return f"+{self.goal_difference}"

        return str(self.goal_difference)