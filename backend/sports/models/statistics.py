from django.db import models


class MatchTeamStatistics(models.Model):
    """
    Statistics for one team in one match.

    Normally there will be:
        - one record for the home team
        - one record for the away team
    """

    match = models.ForeignKey(
        "sports.Match",
        on_delete=models.CASCADE,
        related_name="team_statistics",
    )

    team = models.ForeignKey(
        "sports.Team",
        on_delete=models.CASCADE,
        related_name="match_statistics",
    )

    provider_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    shots_total = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    shots_on_target = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    shots_off_target = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    shots_blocked = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    shots_inside_box = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    shots_outside_box = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    big_chances = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    big_chances_missed = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    possession = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Percentage, e.g. 62.50",
    )

    passes_total = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    passes_accurate = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    pass_accuracy = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    key_passes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    crosses = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    crosses_accurate = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    tackles = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    interceptions = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    clearances = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    blocked_shots = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    fouls = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    yellow_cards = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    red_cards = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    offsides = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    corners = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    free_kicks = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    penalties = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    penalties_scored = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    goalkeeper_saves = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    goals_conceded = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    expected_goals = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
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
        ordering = ["team__name"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "match",
                    "team",
                ],
                name="unique_match_team_statistics",
            )
        ]

        indexes = [
            models.Index(
                fields=[
                    "match",
                    "team",
                ]
            ),
            models.Index(
                fields=[
                    "team",
                    "last_provider_sync",
                ]
            ),
        ]

    def __str__(self):
        return (
            f"{self.team.name} statistics - "
            f"{self.match}"
        )