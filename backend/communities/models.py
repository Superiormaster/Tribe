# communities/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class Tribe(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    allow_reels = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class TribeRequest(models.Model):
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField()
    status = models.CharField(default='pending', max_length=20)  # pending, approved, rejected
    created_at = models.DateTimeField(auto_now_add=True)

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

    user = models.ForeignKey(User, on_delete=models.CASCADE)
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
        User,
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ["community", "user"]

class CommunityInvite(models.Model):

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_community_invites"
    )

    receiver = models.ForeignKey(
        User,
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