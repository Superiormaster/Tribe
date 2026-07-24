from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

User = get_user_model()

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

    chat = models.ForeignKey(
        "chats.Chat",
        on_delete=models.CASCADE,
        related_name="calls",
        null=True,
        blank=True,
    )
    
    initiator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="started_calls",
        null=True,
        blank=True,
    )

    room_id = models.CharField(max_length=255, unique=True)

    call_type = models.CharField(max_length=15, choices=CALL_TYPE)
    status = models.CharField(max_length=15, choices=CALL_STATUS, default="ringing")

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    duration = models.IntegerField(default=0)

    def __str__(self):
        return self.room_id

class CallParticipant(models.Model):
    CALL_PARTICIPANT_STATUS = (
        ("invited", "Invited"),
        ("ringing", "Ringing"),
        ("joined", "Joined"),
        ("declined", "Declined"),
        ("missed", "Missed"),
        ("left", "Left"),
    )
    
    status = models.CharField(
        max_length=10,
        choices=CALL_PARTICIPANT_STATUS,
        default="invited"
    )
    call = models.ForeignKey(
        Call,
        on_delete=models.CASCADE,
        related_name="participants",
        null=True,
        blank=True,
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="call_participations")

    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)

    mic_on = models.BooleanField(default=True)
    camera_on = models.BooleanField(default=False)

    class Meta:
        unique_together = ("call", "user")

class VoiceRoom(models.Model):
    ROOM_STATUS = (
        ("live", "Live"),
        ("ended", "Ended"),
        ("scheduled", "Scheduled"),
    )

    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE,
        related_name="voice_rooms",
        null=True,
        blank=True,
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

    def __str__(self):
        return self.title

class VoiceRoomParticipant(models.Model):
    room = models.ForeignKey(
        VoiceRoom,
        on_delete=models.CASCADE,
        related_name="participants"
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="voice_room_participations")

    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(
      null=True,
      blank=True
    )

    mic_on = models.BooleanField(default=True)

    speaker = models.BooleanField(default=False)

    class Meta:
        unique_together = ("room", "user")
