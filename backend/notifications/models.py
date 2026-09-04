# notifications/models.py

from django.db import models
from django.conf import settings
from django.db.models import Q

User = settings.AUTH_USER_MODEL


class Notification(models.Model):

    TYPES = [
        ("community", "Community"),
        ("recommendation", "Recommendation"),
        ("marketing", "Marketing"),
        ("announcement", "Announcement"),
        ("like", "Like"),
        ("comment_like", "Comment Like"),
        ("comment", "Comment"),
        ("reply", "Reply"),
        ("star", "Star"),
        ("bookmark", "Bookmark"),
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
        ("post_deleted_by_admin", "Post Deleted By Admin"),
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

    recommendation_type = models.CharField(
        max_length=30,
        blank=True,
        default="",
    )

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


class DevicePushToken(models.Model):
    PLATFORM_CHOICES = (
        ("web", "Web"),
        ("android", "Android"),
        ("ios", "iOS"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="push_tokens"
    )

    token = models.TextField(unique=True)

    platform = models.CharField(
        max_length=20,
        choices=PLATFORM_CHOICES,
        default="web"
    )

    browser = models.CharField(
        max_length=50,
        blank=True
    )

    is_active = models.BooleanField(
        default=True
    )

    last_seen_at = models.DateTimeField(
        auto_now=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        indexes = [
            models.Index(
                fields=["user", "is_active"]
            )
        ]
  
    def __str__(self):
        return f"{self.user_id} - {self.platform}"

class UserNotificationPreference(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )

    push_enabled = models.BooleanField(
        default=True
    )

    social_notifications = models.BooleanField(
        default=True
    )

    message_notifications = models.BooleanField(
        default=True
    )

    community_notifications = models.BooleanField(
        default=True
    )

    recommendation_notifications = models.BooleanField(
        default=True
    )

    marketing_notifications = models.BooleanField(
        default=False
    )

    quiet_hours_enabled = models.BooleanField(
        default=False
    )

    quiet_hours_start = models.TimeField(
        null=True,
        blank=True
    )

    quiet_hours_end = models.TimeField(
        null=True,
        blank=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

class PushNotificationDelivery(models.Model):

    STATUS_CHOICES = (
        ("queued", "Queued"),
        ("processing", "Processing"),
        ("sent", "Sent"),
        ("failed", "Failed"),
        ("invalid_token", "Invalid Token"),
        ("skipped", "Skipped"),
    )

    notification = models.ForeignKey(
        "Notification",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="push_deliveries",
    )

    message = models.ForeignKey(
        "chats.Message",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="push_deliveries",
    )

    device = models.ForeignKey(
        DevicePushToken,
        on_delete=models.CASCADE,
        related_name="deliveries",
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="queued",
    )

    group_key = models.CharField(
        max_length=255,
        blank=True,
        default="",
        db_index=True,
    )

    attempts = models.PositiveIntegerField(
        default=0
    )

    scheduled_for = models.DateTimeField(
        null=True,
        blank=True,
    )

    last_error = models.TextField(
        blank=True,
        null=True
    )

    sent_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(
                        notification__isnull=False,
                        message__isnull=True,
                    )
                    |
                    models.Q(
                        notification__isnull=True,
                        message__isnull=False,
                    )
                ),
                name="delivery_has_one_source",
            ),
            models.UniqueConstraint(
                fields=[
                    "notification",
                    "device",
                ],
                name="unique_notification_device_delivery",
            ),
            models.UniqueConstraint(
                fields=[
                    "message",
                    "device",
                ],
                name="unique_message_device_delivery",
            ),
        ]