from django.db import models


class Player(models.Model):
    provider_id = models.PositiveBigIntegerField(
        unique=True,
        db_index=True,
    )

    firstname = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    lastname = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    commonname = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    name = models.CharField(
        max_length=200,
    )

    age = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    birth_date = models.DateField(
        null=True,
        blank=True,
    )

    birth_place = models.CharField(
        max_length=200,
        blank=True,
        null=True,
    )

    birth_country = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )

    nationality = models.CharField(
        max_length=150,
        blank=True,
        null=True,
    )

    height = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    weight = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    position = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    number = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    photo_url = models.URLField(
        blank=True,
        null=True,
    )

    injured = models.BooleanField(
        default=False,
    )
  
    provider_data = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class PlayerTeam(models.Model):
    """
    Player-team relationship.

    A player can play for different teams
    throughout their career.
    """

    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="team_history",
    )

    team = models.ForeignKey(
        "sports.Team",
        on_delete=models.CASCADE,
        related_name="players",
    )

    season = models.ForeignKey(
        "sports.CompetitionSeason",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="player_teams",
    )

    position = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    shirt_number = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    is_current = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["team", "is_current"]
            ),
        ]

    def __str__(self):
        return f"{self.player.name} - {self.team.name}"