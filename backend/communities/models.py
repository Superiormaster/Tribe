# communities/models.py
from django.db import models
from django.conf import settings

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

    muted = models.BooleanField(default=False)
    banned = models.BooleanField(default=False)

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