from django.db import models

from .competition import Country


class Team(models.Model):
    provider_id = models.PositiveBigIntegerField(
        unique=True,
        db_index=True,
    )

    name = models.CharField(max_length=200)

    short_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    logo_url = models.URLField(
        blank=True,
        null=True,
    )

    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teams",
    )

    founded_year = models.PositiveIntegerField(
        null=True,
        blank=True,
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

    venue_capacity = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    venue_image_url = models.URLField(
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
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


class TeamCompetition(models.Model):
    """
    Connects teams to competitions/seasons.

    This is useful because a team can participate
    in multiple competitions during the same season.
    """

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="competition_entries",
    )

    competition = models.ForeignKey(
        "sports.Competition",
        on_delete=models.CASCADE,
        related_name="team_entries",
    )

    season = models.ForeignKey(
        "sports.CompetitionSeason",
        on_delete=models.CASCADE,
        related_name="team_entries",
    )

    group_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    provider_data = models.JSONField(
        default=dict,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "team",
                    "competition",
                    "season",
                ],
                name="unique_team_competition_season",
            )
        ]

    def __str__(self):
        return (
            f"{self.team.name} - "
            f"{self.competition.name} "
            f"{self.season.season}"
        )