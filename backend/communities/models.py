# communities/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

User = get_user_model()

class Tribe(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    allow_reels = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class TribeRequest(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )
  
    tribe = models.OneToOneField(
      Tribe,
      null=True,
      blank=True,
      on_delete=models.SET_NULL,
      related_name="request"
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tribe_requests"
    )

    name = models.CharField(max_length=100)
    description = models.TextField()

    # Why the user wants this tribe
    request_reason = models.TextField(
        blank=True,
        default=""
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_tribe_requests"
    )

    rejection_reason = models.TextField(
        blank=True,
        default=""
    )

    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-created_at"]

class Community(models.Model):
    name = models.CharField(max_length=255, unique=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_communities')
    description = models.TextField(blank=True, null=True)
    cover_image = models.URLField(default="https://res.cloudinary.com/demo/image/upload/default.png", blank=True)
    intro_video = models.URLField(blank=True, null=True)
    require_post_approval = models.BooleanField(default=False)
    join_approval_required = models.BooleanField(
        default=False
    )
    tribe = models.ForeignKey(Tribe, null=True, on_delete=models.SET_NULL, related_name="communities")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class CommunityMembership(models.Model):
    ROLE_MEMBER = "member"
    ROLE_MODERATOR = "moderator"
    ROLE_ADMIN = "admin"

    ROLE_CHOICES = (
        (ROLE_MEMBER, "Member"),
        (ROLE_MODERATOR, "Moderator"),
        (ROLE_ADMIN, "Admin"),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name="memberships")

    role = models.CharField(
      max_length=20,
      choices=ROLE_CHOICES,
      default=ROLE_MEMBER
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "community")

class CommunityJoinRequest(models.Model):

    community = models.ForeignKey(
        Community,
        on_delete=models.CASCADE,
        related_name="join_requests"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ["community", "user"]

class CommunityInvite(models.Model):

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_community_invites"
    )

    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_community_invites"
    )

    community = models.ForeignKey(
        Community,
        on_delete=models.CASCADE,
        related_name="invites"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (
            "receiver",
            "community"
        )


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