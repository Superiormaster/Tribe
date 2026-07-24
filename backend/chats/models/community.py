from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from communities.models import Tribe

User = get_user_model()

class CommunityEvent(models.Model):
    EVENT_TYPE = (
        ("voice", "Voice Event"),
        ("live", "Live Stream"),
        ("meeting", "Meeting"),
        ("hangout", "Hangout"),
    )

    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE,
        related_name="events"
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    title = models.CharField(max_length=255)

    description = models.TextField()

    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPE
    )

    scheduled_for = models.DateTimeField()

    duration_minutes = models.IntegerField(default=60)

    is_cancelled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

class AnnouncementChannel(models.Model):
    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE,
        related_name="announcement_channels"
    )

    name = models.CharField(max_length=100)

    description = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(auto_now_add=True)

class AnnouncementPost(models.Model):
    channel = models.ForeignKey(
        AnnouncementChannel,
        on_delete=models.CASCADE,
        related_name="posts"
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    title = models.CharField(max_length=255)

    content = models.TextField()

    image = models.URLField(blank=True, null=True)

    is_pinned = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)