from django.db import models


class MatchLineup(models.Model):
    """
    One lineup for one team in one match.

    A match normally has:
        - one home lineup
        - one away lineup
    """

    match = models.ForeignKey(
        "sports.Match",
        on_delete=models.CASCADE,
        related_name="lineups",
    )

    team = models.ForeignKey(
        "sports.Team",
        on_delete=models.CASCADE,
        related_name="match_lineups",
    )

    provider_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    formation = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    coach_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
    )

    coach_provider_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
    )

    # Used when the provider tells us whether this lineup
    # was confirmed before the match.
    confirmed = models.BooleanField(
        default=False,
    )

    provider_data = models.JSONField(
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
        ordering = ["team__name"]

        constraints = [
            models.UniqueConstraint(
                fields=["match", "team"],
                name="unique_match_team_lineup",
            )
        ]

        indexes = [
            models.Index(
                fields=["match", "team"],
            ),
        ]

    def __str__(self):
        return f"{self.team.name} lineup - {self.match}"


class MatchLineupPlayer(models.Model):
    """
    A player's appearance in a particular match lineup.

    This is NOT the player's permanent profile.

    Player:
        Mohamed Salah

    LineupPlayer:
        Salah's role in Liverpool vs Villarreal.
    """

    class Position(models.TextChoices):
        GOALKEEPER = "G", "Goalkeeper"
        DEFENDER = "D", "Defender"
        MIDFIELDER = "M", "Midfielder"
        FORWARD = "F", "Forward"
        SUBSTITUTE = "S", "Substitute"
        UNKNOWN = "U", "Unknown"

    lineup = models.ForeignKey(
        MatchLineup,
        on_delete=models.CASCADE,
        related_name="players",
    )

    player = models.ForeignKey(
        "sports.Player",
        on_delete=models.CASCADE,
        related_name="lineup_appearances",
    )

    player_provider_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    number = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    position = models.CharField(
        max_length=20,
        choices=Position.choices,
        default=Position.UNKNOWN,
    )

    position_detail = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    grid_position = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        help_text="Provider formation/grid position.",
    )

    starter = models.BooleanField(
        default=False,
        db_index=True,
    )

    substitute = models.BooleanField(
        default=False,
    )

    captain = models.BooleanField(
        default=False,
    )

    minutes_played = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    rating = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
    )

    substituted_in_minute = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    substituted_out_minute = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    injured = models.BooleanField(
        default=False,
    )

    offsides = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    shots_total = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    shots_on_target = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    goals = models.PositiveIntegerField(
        default=0,
    )

    assists = models.PositiveIntegerField(
        default=0,
    )

    passes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    key_passes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    tackles = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    grid = models.PositiveIntegerField(
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

    fouls_committed = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    fouls_drawn = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    yellow_cards = models.PositiveIntegerField(
        default=0,
    )

    red_cards = models.PositiveIntegerField(
        default=0,
    )

    provider_data = models.JSONField(
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
        ordering = [
            "-starter",
            "number",
            "player__name",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "lineup",
                    "player",
                ],
                name="unique_lineup_player",
            )
        ]

        indexes = [
            models.Index(
                fields=[
                    "lineup",
                    "starter",
                ]
            ),
            models.Index(
                fields=[
                    "player",
                    "starter",
                ]
            ),
        ]

    def __str__(self):
        return (
            f"{self.player.name} - "
            f"{self.lineup.team.name}"
        )