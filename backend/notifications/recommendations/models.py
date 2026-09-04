from django.conf import settings
from django.db import models


User = settings.AUTH_USER_MODEL


class UserInterest(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="interests",
    )

    topic = models.CharField(
        max_length=100,
        db_index=True,
    )

    score = models.FloatField(
        default=0.0,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "topic"],
                name="unique_user_interest_topic",
            )
        ]

        indexes = [
            models.Index(
                fields=["user", "-score"],
            ),
            models.Index(
                fields=["topic", "-score"],
            ),
        ]

    def __str__(self):
        return f"{self.user_id}: {self.topic} ({self.score})"


class UserRecommendation(models.Model):
    RECOMMENDATION_TYPES = (
        ("people", "People"),
        ("post", "Post"),
        ("community", "Community"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="recommendations",
    )

    recommendation_type = models.CharField(
        max_length=20,
        default="",
        choices=RECOMMENDATION_TYPES,
    )

    recommended_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recommended_to",
    )

    post = models.ForeignKey(
        "post.Post",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recommendations",
    )

    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recommendations",
    )

    score = models.FloatField(
        default=0.0,
    )

    reason = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    seen = models.BooleanField(
        default=False
    )

    dismissed = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        indexes = [
            models.Index(
                fields=["user", "recommendation_type", "-score"],
            ),
        ]

    def __str__(self):
        return (
            f"{self.user_id} → "
            f"{self.recommended_user_id} "
            f"({self.score})"
        )

