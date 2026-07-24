from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from communities.models import Tribe

User = get_user_model()

class UserPresence(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    is_online = models.BooleanField(default=False)

    last_seen = models.DateTimeField(
        null=True,
        blank=True
    )

class TypingStatus(models.Model):

    chat = models.ForeignKey(
        "chats.Chat",
        on_delete=models.CASCADE
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    is_typing = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)