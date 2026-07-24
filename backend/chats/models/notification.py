from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

User = get_user_model()

class Notification(models.Model):

    TYPE = (
        ("message", "Message"),
        ("reaction", "Reaction"),
        ("mention", "Mention"),
        ("reply", "Reply"),
        ("call", "Call"),
        ("missed_call", "Missed Call"),
        ("community", "Community"),
        ("announcement", "Announcement"),
        ("system", "System"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    sender = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )

    chat = models.ForeignKey(
        "chats.Chat",
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )

    message = models.ForeignKey(
        "chats.Message",
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )

    community = models.ForeignKey(
        "communities.Community",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="chat_notifications"
    )

    notification_type = models.CharField(
        max_length=20,
        choices=TYPE,
        null=True
    )

    media_type = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    title = models.CharField(max_length=255, null=True)

    body = models.TextField(null=True, blank=True)

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)