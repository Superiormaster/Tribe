from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

User = get_user_model()

class CommunityChatSettings(models.Model):
    community = models.OneToOneField(
        "communities.Community",
        on_delete=models.CASCADE,
        related_name="chat_settings"
    )

    # MESSAGE PERMISSIONS
    allow_media = models.BooleanField(default=True)
    allow_voice_notes = models.BooleanField(default=True)

    # SLOW MODE
    slow_mode_seconds = models.PositiveIntegerField(default=0)

    # JOIN APPROVAL
    require_admin_approval = models.BooleanField(default=False)

    # PIN LIMIT
    max_pinned_messages = models.PositiveIntegerField(default=5)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.community.name} Chat Settings"