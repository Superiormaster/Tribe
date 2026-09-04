from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from communities.models import CommunityMembership

User = get_user_model()

class Chat(models.Model):
    CHAT_TYPE = (
        ("private", "Private"),
        ("group", "Group"),
        ("community", "Community"),
        ("channel", "Channel"),
    )

    name = models.CharField(max_length=100, blank=True, null=True)
    chat_key = models.CharField(max_length=255, unique=True, blank=True)
    chat_type = models.CharField(
        max_length=20,
        choices=CHAT_TYPE,
        default="private"
    )
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_chats"
    )
    community = models.ForeignKey(
        "communities.Community",
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )
    is_pinned = models.BooleanField(default=False)
    pinned_at = models.DateTimeField(null=True, blank=True)
    pinned_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pinned_messages"
    )
    is_locked = models.BooleanField(default=False)
    last_message = models.ForeignKey(
        "chats.Message",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+"
    )

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
      if (
        self.chat_type == "private"
        and self.participants.count() > 2
      ):
        raise ValidationError(
            "Private chat cannot have more than 2 members"
        )

    def __str__(self):
      if self.chat_type == "community" and self.community:
          return self.community.name
  
      if self.name:
          return self.name
  
      return f"{self.chat_type.title()} Chat #{self.pk}"
  
    def is_chat_admin(self, user):
        if self.chat_type != "community" or not self.community:
            return False

        if self.community.owner_id == user.id:
            return True

        return CommunityMembership.objects.filter(
            community=self.community,
            user=user,
            role__in=[
                CommunityMembership.ROLE_ADMIN,
                CommunityMembership.ROLE_MODERATOR,
            ],
        ).exists()

class ChatParticipant(models.Model):
    ROLE = (
        ("member", "Member"),
        ("admin", "Admin"),
        ("owner", "Owner"),
    )

    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name="participants"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="chat_participations"
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE,
        default="member"
    )
    unread_count = models.PositiveIntegerField(default=0)

    joined_at = models.DateTimeField(auto_now_add=True)

    last_delivered_message = models.ForeignKey(
        "chats.Message",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(
        null=True,
        blank=True
    )

    pinned = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)

    pinned_at = models.DateTimeField(
        null=True,
        blank=True
    )

    archived_at = models.DateTimeField(
        null=True,
        blank=True
    )

    is_muted = models.BooleanField(
        default=False
    )

    muted_until = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        unique_together = ("chat", "user")

    def __str__(self):
        return f"{self.user.username} in {self.chat_id}"


class ChatReadState(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    last_seen_message = models.ForeignKey("chats.Message", null=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "chat")