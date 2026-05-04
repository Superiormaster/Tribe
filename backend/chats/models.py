# chats/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

class Chat(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True)
    is_group = models.BooleanField(default=False)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chats')
    chat_key = models.CharField(max_length=255, unique=True, blank=True)
    community = models.ForeignKey(
        "communities.Community",
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )
    last_message = models.ForeignKey(
        "Message",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
      constraints = [
          models.UniqueConstraint(
              fields=["chat_key"],
              name="unique_private_chat"
          )
      ]

    def clean(self):
      if not self.is_group and self.members.count() > 2:
          raise ValidationError("Private chat cannot have more than 2 members")

    def __str__(self):
      if self.is_group:
          return f"Group: {self.name or 'Unnamed'}"
      else:
          members = self.members.all()
          usernames = ", ".join([m.username for m in members]) if members else "Empty"
          return f"Private Chat ({usernames})"

class Message(models.Model):
    chat = models.ForeignKey(Chat, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField(blank=True, null=True)

    # MEDIA (Cloudinary URL)
    media_url = models.URLField(blank=True, null=True)
    media_type = models.CharField(
        max_length=10,
        choices=[
            ("text", "Text"),
            ("image", "Image"),
            ("video", "Video"),
            ("audio", "Audio"),
            ("file", "File"),
        ],
        blank=True,
        default="text",
        null=True,
    )

    # OPTIONAL (for videos)
    thumbnail = models.URLField(blank=True, null=True)

    # FEATURES
    is_pinned = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    # REPLY SYSTEM
    reply_to = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies"
    )

    # STATUS
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    seen_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="seen_messages",
        blank=True
    )
    ephemeral = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
      indexes = [
          models.Index(fields=["chat", "-created_at"]),
          models.Index(fields=["sender"]),
      ]

    def __str__(self):
        return f"{self.sender.username}: {self.content[:20] or self.media_type}"

class ChatReadState(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    last_seen_message = models.ForeignKey(Message, null=True, on_delete=models.SET_NULL)

class MessageReaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)

class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    type = models.CharField(
        max_length=20,
        choices=[
            ("message", "Message"),
            ("reaction", "Reaction"),
            ("system", "System"),
        ],
        default="message"
    )
    created_at = models.DateTimeField(auto_now_add=True)

class Call(models.Model):
    CALL_TYPE = (
        ("audio", "Audio"),
        ("video", "Video"),
    )

    CALL_STATUS = (
        ("ringing", "Ringing"),
        ("ongoing", "Ongoing"),
        ("ended", "Ended"),
        ("missed", "Missed"),
    )

    room_id = models.CharField(max_length=255, unique=True)

    participants = models.ManyToManyField(User, related_name="calls")

    call_type = models.CharField(max_length=10, choices=CALL_TYPE)
    status = models.CharField(max_length=10, choices=CALL_STATUS, default="ringing")

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    duration = models.IntegerField(default=0)  # seconds

    def __str__(self):
        return self.room_id