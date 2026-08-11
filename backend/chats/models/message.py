from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

User = get_user_model()

class Message(models.Model):
    chat = models.ForeignKey( "chats.Chat", related_name='messages', on_delete=models.CASCADE)
    community = models.ForeignKey(
      "communities.Community",
      null=True,
      blank=True,
      on_delete=models.CASCADE,
      related_name="messages",
    )
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    encrypted_text = models.TextField(
        blank=True,
        null=True
    )
    caption = models.TextField(blank=True, null=True)

    # MEDIA (r2 URL)
    media_assets = models.ManyToManyField(
        "media.MediaAsset",
        blank=True,
        related_name="messages",
    )
    
    media_type = models.CharField(
        max_length=10,
        choices=[
            ("text", "Text"),
            ("image", "Image"),
            ("video", "Video"),
            ("audio", "Audio"),
            ("gallery", "Gallery"),
            ('gif', 'GIF'),
            ('sticker', 'Sticker'),
        ],
        blank=True,
        default="text",
        null=True,
    )
    media_source = models.CharField(
        max_length=20,
        choices=[
            ('upload', 'Upload'),
            ('external', 'External'),
            ('forward', 'Forward'),
        ],
        null=True,
        blank=True
    )
    edited_at = models.DateTimeField(
        null=True,
        blank=True
    )
    is_edited = models.BooleanField(default=False)
    client_id = models.CharField(
      max_length=100,
      null=True,
      blank=True,
      db_index=True,
    )
  
    waveform = models.JSONField(default=list, blank=True)

    # FEATURES
    is_pinned = models.BooleanField(default=False)
    pinned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="message_pins"
    )
    
    pinned_at = models.DateTimeField(
        null=True,
        blank=True
    )
    is_deleted = models.BooleanField(default=False)
    hidden_for = models.ManyToManyField(User, related_name="hidden_messages", blank=True)

    forwarded_from = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    mentions = models.ManyToManyField(
        User,
        blank=True,
        related_name="mentioned_messages"
    )
    # REPLY SYSTEM
    reply_to = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies"
    )

    deleted_by_admin = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(auto_now=True)

    class Meta:
      indexes = [
          models.Index(fields=["chat", "-created_at"]),
          models.Index(fields=["sender"]),
          models.Index(fields=["client_id"]),
          models.Index(fields=["created_at"]),
      ]

    def hide_for_user(message, user):
      message.hidden_for.add(user)

    def __str__(self):
      preview = self.encrypted_text or self.media_type or "message"
      return f"{self.id} - {preview}"


class MessageRead(models.Model):

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    seen_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ("message", "user")


class MessageReaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)
  
    class Meta:
      unique_together = (
          "message",
          "user"
      )

class MessageBlockedUser(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="message_blocks"
    )
    blocked_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="message_blocked_by"
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = (
            "user",
            "blocked_user",
        )

class MessageEdit(models.Model):

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="history"
    )

    old_text = models.TextField()

    edited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    edited_at = models.DateTimeField(
        auto_now_add=True
    )
