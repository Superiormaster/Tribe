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
        ("join_rejected", "Join Rejected"),
        ("join_approved", "Join Approved"),
        ("join_request", "Join Request"),
        ("community_ban", "Community Ban"),
        ("community_unban", "Community Unban"),
        ("community_removed", "Community Removed"),
        ("moderator_added", "Moderator Added"),
        ("admin_added", "Admin Added"),
        ("role_removed", "Role Removed"),
        ("post_approved", "Post Approved"),
        ("post_rejected", "Post Rejected"),
        ("approval", "Approval"),
        ("tribe_request_rejected", "Tribe Request Rejected"),
        ("tribe_request_approved", "Tribe Request Approved")
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

    type = models.CharField(max_length=50, choices=TYPES)

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
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    
    tribe_request = models.ForeignKey(
        "communities.TribeRequest",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
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

class NotificationSettings(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="notification_settings"
    )

    notifications_enabled = models.BooleanField(
        default=True
    )

    likes = models.BooleanField(default=True)
    comments = models.BooleanField(default=True)
    replies = models.BooleanField(default=True)
    messages = models.BooleanField(default=True)
    community_updates = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} settings"