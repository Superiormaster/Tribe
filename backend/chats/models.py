# chats/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from communities.models import Tribe

User = get_user_model()

class Chat(models.Model):
    CHAT_TYPE = (
        ("private", "Private"),
        ("community", "Community"),
    )

    name = models.CharField(max_length=100, blank=True, null=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chats')
    chat_key = models.CharField(max_length=255, unique=True, blank=True)
    chat_type = models.CharField(
        max_length=20,
        choices=CHAT_TYPE,
        default="private"
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
    requires_approval = models.BooleanField(default=False)
    allow_media = models.BooleanField(default=True)
    allow_voice_notes = models.BooleanField(default=True)
    is_locked = models.BooleanField(default=False)
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
      if self.chat_type == "private" and self.members.count() > 2:
          raise ValidationError(
              "Private chat cannot have more than 2 members"
          )

    def __str__(self):
      if self.chat_type == "community":
          return f"Community Chat: {self.community.name}"
  
      members = self.members.all()
  
      usernames = ", ".join(
          [m.username for m in members]
      ) if members else "Empty"
  
      return f"Private Chat ({usernames})"

    def is_chat_admin(self, user):
      if self.chat_type != "community":
          return False
  
      return (
          self.community.owner == user
          or self.community.admins.filter(id=user.id).exists()
          or self.community.moderators.filter(id=user.id).exists()
      )

class MessageEncryption(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_encryptions")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_encryptions")

    ciphertext = models.JSONField()  

    created_at = models.DateTimeField(auto_now_add=True)

class Message(models.Model):
    chat = models.ForeignKey(Chat, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    encrypted_text = models.TextField(
        blank=True,
        null=True
    )
    caption = models.TextField(blank=True, null=True)

    # MEDIA (Cloudinary URL)
    media_url = models.JSONField(
        default=list,
        blank=True,
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
    client_id = models.CharField(
      max_length=100,
      null=True,
      blank=True,
      db_index=True,
    )

    # OPTIONAL (for videos)
    thumbnail = models.JSONField(
        default=list,
        blank=True,
    )
  
    duration = models.JSONField(
        default=list,
        blank=True,
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

    # STATUS
    seen_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="seen_messages",
        blank=True
    )
    ephemeral = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(auto_now=True)

    class Meta:
      indexes = [
          models.Index(fields=["chat", "-created_at"]),
          models.Index(fields=["sender"]),
      ]

    def hide_for_user(message, user):
      message.hidden_for.add(user)

    def __str__(self):
      preview = self.encrypted_text or self.media_type or "message"
      return f"{self.id} - {preview}"

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

class ChatReadState(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    last_seen_message = models.ForeignKey(Message, null=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "chat")

class MessageReaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)
  
    class Meta:
      unique_together = (
          "message",
          "user"
      )

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

# =========================
# COMMUNITY CHAT SETTINGS
# =========================

class CommunityChatSettings(models.Model):
    community = models.OneToOneField(
        "communities.Community",
        on_delete=models.CASCADE,
        related_name="chat_settings"
    )

    # MESSAGE PERMISSIONS
    can_send_messages = models.BooleanField(default=True)
    can_send_media = models.BooleanField(default=True)
    can_send_links = models.BooleanField(default=True)

    # SLOW MODE
    slow_mode_seconds = models.PositiveIntegerField(default=0)

    # JOIN APPROVAL
    require_admin_approval = models.BooleanField(default=False)

    # PIN LIMIT
    max_pinned_messages = models.PositiveIntegerField(default=5)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.community.name} Chat Settings"


# =========================
# MUTED USERS
# =========================

class CommunityMute(models.Model):
    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE,
        related_name="muted_users"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    muted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="muted_members"
    )

    reason = models.TextField(blank=True, null=True)

    muted_until = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("community", "user")

    @property
    def is_active(self):
        return timezone.now() < self.muted_until

    def __str__(self):
        return f"{self.user} muted in {self.community}"


# =========================
# BANNED USERS
# =========================

class CommunityBan(models.Model):
    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE,
        related_name="banned_users"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    banned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="banned_members"
    )

    reason = models.TextField(blank=True, null=True)

    permanent = models.BooleanField(default=True)

    banned_until = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("community", "user")

    @property
    def is_active(self):
        if self.permanent:
            return True

        if self.banned_until:
            return timezone.now() < self.banned_until

        return False

    def __str__(self):
        return f"{self.user} banned in {self.community}"


# =========================
# MESSAGE REPORTS
# =========================

class MessageReport(models.Model):
    REPORT_REASONS = (
        ("spam", "Spam"),
        ("harassment", "Harassment"),
        ("hate", "Hate Speech"),
        ("violence", "Violence"),
        ("fake", "Fake Information"),
        ("adult", "Adult Content"),
        ("other", "Other"),
    )

    STATUS = (
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("dismissed", "Dismissed"),
        ("action_taken", "Action Taken"),
    )

    message = models.ForeignKey(
        "Message",
        on_delete=models.CASCADE,
        related_name="reports"
    )

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    reason = models.CharField(
        max_length=50,
        choices=REPORT_REASONS
    )

    note = models.TextField(blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS,
        default="pending"
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_reports"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "reporter")

    def __str__(self):
        return f"Report on message {self.message.id}"

class VoiceRoom(models.Model):
    ROOM_STATUS = (
        ("live", "Live"),
        ("ended", "Ended"),
        ("scheduled", "Scheduled"),
    )

    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE,
        related_name="voice_rooms"
    )

    title = models.CharField(max_length=255)

    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hosted_voice_rooms"
    )

    room_id = models.CharField(
        max_length=255,
        unique=True
    )

    status = models.CharField(
        max_length=20,
        choices=ROOM_STATUS,
        default="live"
    )

    started_at = models.DateTimeField(auto_now_add=True)

    ended_at = models.DateTimeField(
        null=True,
        blank=True
    )

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="joined_voice_rooms"
    )

    def __str__(self):
        return self.title

class CommunityAnalytics(models.Model):
    community = models.OneToOneField(
        "communities.Community",
        on_delete=models.CASCADE
    )

    total_messages = models.IntegerField(default=0)

    total_members = models.IntegerField(default=0)

    daily_active_users = models.IntegerField(default=0)

    weekly_active_users = models.IntegerField(default=0)

    monthly_active_users = models.IntegerField(default=0)

    total_reports = models.IntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

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

class CommunityAuditLog(models.Model):
    ACTIONS = (
        ("mute", "Muted User"),
        ("ban", "Banned User"),
        ("delete_message", "Deleted Message"),
        ("pin_message", "Pinned Message"),
        ("role_update", "Role Updated"),
        ("settings_update", "Settings Updated"),
    )

    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_actions"
    )

    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_targets"
    )

    action = models.CharField(
        max_length=50,
        choices=ACTIONS
    )

    details = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

class MessageThread(models.Model):
    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE
    )

    parent_message = models.ForeignKey(
        "Message",
        on_delete=models.CASCADE,
        related_name="threads"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(auto_now_add=True)

class ThreadReply(models.Model):
    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        related_name="replies"
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    text = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

class Sticker(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='stickers'
    )

    tribe = models.ForeignKey(
        Tribe,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='stickers'
    )

    image_url = models.URLField()

    tags = models.JSONField(default=list)

    usage_count = models.IntegerField(default=0)

    is_public = models.BooleanField(default=False)

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f'Sticker {self.id}'

class GifReaction(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='gif_reactions'
    )

    tribe = models.ForeignKey(
        Tribe,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='gif_reactions'
    )

    media = models.URLField()

    preview = models.URLField(
        blank=True,
        null=True
    )

    title = models.CharField(
        max_length=255,
        blank=True
    )

    tags = models.JSONField(default=list)

    source = models.CharField(
        max_length=50,
        default='giphy'
    )

    usage_count = models.IntegerField(default=0)

    is_public = models.BooleanField(default=True)

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.title or f'GIF {self.id}'

class StickerPack(models.Model):

    tribe = models.ForeignKey(
        Tribe,
        on_delete=models.CASCADE,
        related_name='sticker_packs'
    )

    name = models.CharField(max_length=100)

    cover = models.URLField()

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name

class StickerPackItem(models.Model):

    pack = models.ForeignKey(
        StickerPack,
        on_delete=models.CASCADE,
        related_name='items'
    )

    sticker = models.ForeignKey(
        Sticker,
        on_delete=models.CASCADE
    )

    added_at = models.DateTimeField(
        auto_now_add=True
    )

class ChatParticipant(models.Model):
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

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    last_delivered_message = models.ForeignKey(
        "Message",
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
