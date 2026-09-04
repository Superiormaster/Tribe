from django.db import models


class MatchEvent(models.Model):
    class EventType(models.TextChoices):
        GOAL = "goal", "Goal"
        CARD = "card", "Card"
        SUBSTITUTION = "substitution", "Substitution"
        VAR = "var", "VAR"
        PENALTY = "penalty", "Penalty"
        MISS = "miss", "Miss"
        OTHER = "other", "Other"

    class GoalType(models.TextChoices):
        REGULAR = "regular", "Regular"
        OWN_GOAL = "own_goal", "Own Goal"
        PENALTY = "penalty", "Penalty"

    class CardType(models.TextChoices):
        YELLOW = "yellow", "Yellow"
        RED = "red", "Red"
        SECOND_YELLOW = "second_yellow", "Second Yellow"

    class VARType(models.TextChoices):
        GOAL_CHECK = "goal_check", "Goal Check"
        GOAL_CANCELLED = "goal_cancelled", "Goal Cancelled"
        PENALTY_CHECK = "penalty_check", "Penalty Check"
        PENALTY_CANCELLED = "penalty_cancelled", "Penalty Cancelled"
        OTHER = "other", "Other"

    match = models.ForeignKey(
        "sports.Match",
        on_delete=models.CASCADE,
        related_name="events",
    )

    provider_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        db_index=True,
    )

    event_type = models.CharField(
        max_length=30,
        choices=EventType.choices,
        db_index=True,
    )

    detail = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )

    comments = models.TextField(
        blank=True,
        null=True,
    )

    minute = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    extra_minute = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    team = models.ForeignKey(
        "sports.Team",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="match_events",
    )

    player = models.ForeignKey(
        "sports.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="match_events",
    )

    assist_player = models.ForeignKey(
        "sports.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assists",
    )

    goal_type = models.CharField(
        max_length=30,
        choices=GoalType.choices,
        blank=True,
        null=True,
    )

    is_penalty_goal = models.BooleanField(
        default=False,
    )

    is_own_goal = models.BooleanField(
        default=False,
    )

    card_type = models.CharField(
        max_length=30,
        choices=CardType.choices,
        blank=True,
        null=True,
    )

    player_in = models.ForeignKey(
        "sports.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="substitution_ins",
    )

    player_out = models.ForeignKey(
        "sports.Player",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="substitution_outs",
    )

    var_type = models.CharField(
        max_length=50,
        choices=VARType.choices,
        blank=True,
        null=True,
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
            "minute",
            "extra_minute",
            "id",
        ]

        indexes = [
            models.Index(
                fields=[
                    "match",
                    "minute",
                ]
            ),
            models.Index(
                fields=[
                    "match",
                    "event_type",
                ]
            ),
            models.Index(
                fields=[
                    "team",
                    "event_type",
                ]
            ),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "match",
                    "provider_id",
                ],
                name="unique_match_provider_event",
            )
        ]

    def __str__(self):
        if self.minute is not None:
            minute = f"{self.minute}'"

            if self.extra_minute:
                minute = (
                    f"{self.minute}+"
                    f"{self.extra_minute}'"
                )

        else:
            minute = "Unknown time"

        return (
            f"{minute} - "
            f"{self.event_type} - "
            f"{self.match}"
        )

    @property
    def display_minute(self):
        """
        Example:
        67
        45+2
        """

        if self.minute is None:
            return None

        if self.extra_minute:
            return f"{self.minute}+{self.extra_minute}"

        return str(self.minute)