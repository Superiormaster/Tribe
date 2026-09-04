from django.db import models


class Country(models.Model):
    """
    Country information supplied by the sports provider.
    """

    provider_id = models.PositiveBigIntegerField(
        unique=True,
        null=True,
        blank=True,
        db_index=True,
    )

    name = models.CharField(max_length=150)

    code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
    )

    flag_url = models.URLField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Competition(models.Model):
    """
    League / cup / tournament.
    """

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

    type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="League, Cup, etc.",
    )

    provider_data = models.JSONField(
        default=dict,
        blank=True,
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
        related_name="competitions",
    )

    is_popular = models.BooleanField(
        default=False,
        db_index=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "is_popular"]),
        ]

    def __str__(self):
        return self.name


class CompetitionSeason(models.Model):
    """
    A competition can have many seasons.

    Example:
    Premier League
      - 2024/25
      - 2025/26
      - 2026/27
    """

    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name="seasons",
    )

    provider_id = models.PositiveBigIntegerField(
        unique=True,
        db_index=True,
    )

    season = models.PositiveIntegerField(
        help_text="Example: 2026",
    )

    name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    start_date = models.DateField(
        null=True,
        blank=True,
    )

    end_date = models.DateField(
        null=True,
        blank=True,
    )

    is_current = models.BooleanField(
        default=False,
        db_index=True,
    )

    provider_data = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-season"]
        constraints = [
            models.UniqueConstraint(
                fields=["competition", "season"],
                name="unique_competition_season",
            )
        ]

    def __str__(self):
        return f"{self.competition.name} {self.season}"