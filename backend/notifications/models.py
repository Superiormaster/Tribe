# notifications/models.py

from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Notification(models.Model):

    TYPES = [
        ("like", "Like"),
        ("comment_like", "Comment Like"),
        ("comment", "Comment"),
        ("reply", "Reply"),
        ("star", "Star"),
        ("connected", "Connected"),
        ("connection_request", "Connection Request"),
        ("connection_accept", "Connection Accept"),
        ("connection_declined", "Connection Declined"),
        ("share", "Share"),
        ("repost", "Repost"),
        ("message", "Message"),
        ("video", "Video"),
        ("community", "Community"),
        ("invite", "Invite"),
        ("invite_accept", "Invite Accept"),
        ("approval", "Approval"),
    ]

    recipient = models.ForeignKey(
        User,
        related_name="notifications",
        on_delete=models.CASCADE
    )

    actors = models.ManyToManyField(
        User,
        related_name="notification_actors"
    )

    type = models.CharField(max_length=20, choices=TYPES)

    message = models.TextField()

    post = models.ForeignKey(
        "post.Post",
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )

    community = models.ForeignKey(
        "communities.Community",
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )

    group_key = models.CharField(max_length=255, null=True, blank=True)

    count = models.PositiveIntegerField(default=1)

    read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["recipient", "group_key"]),
        ]

    def __str__(self):
        return f"{self.type} -> {self.recipient}"