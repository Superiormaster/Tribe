from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.crypto import get_random_string
from django.conf import settings
from PIL import Image
import os
from django.utils import timezone

class User(AbstractUser):

    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    username = models.CharField(max_length=150, unique=True)
    full_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True, null=True)
    avatar = models.URLField(blank=True, null=True)
    cover_photo = models.URLField(blank=True, null=True)
    avatar_asset = models.ForeignKey(
        "media.MediaAsset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="avatar_users",
    )
    
    cover_asset = models.ForeignKey(
        "media.MediaAsset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cover_users",
    )

    onboarding_step = models.IntegerField(default=1)

    country = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)

    website = models.CharField(
        max_length=255,
        blank=True
    )
    role = models.CharField(
        max_length=20,
        default="user",
        choices=[
            ("user", "User"),
            ("admin", "Admin"),
            ("superadmin", "Super Admin"),
        ],
    )
    
    gender = models.CharField(
        max_length=20,
        blank=True,
        choices=[
            ("male", "Male"),
            ("female", "Female"),
            ("other", "Other"),
            ("prefer_not", "Prefer not to say"),
        ]
    )
    what_do_you_do = models.CharField(
      max_length=100,
      blank=True,
      help_text="Tell people what you do"
    )
    
    date_of_birth = models.DateField(null=True, blank=True)

    verified = models.BooleanField(default=False)

    credibility_score = models.IntegerField(default=0)
    is_deactivated = models.BooleanField(
        default=False
    )
    
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    # Monetization (future)
    tips_enabled = models.BooleanField(default=False)
    subscription_price = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    support_link = models.URLField(blank=True)
    newsletter_link = models.URLField(blank=True)

    # Existing system
    email_verified = models.BooleanField(default=False)

    verification_code = models.CharField(
        max_length=64,
        blank=True,
        null=True
    )

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    last_seen = models.DateTimeField(null=True, blank=True)

    stars_count = models.IntegerField(default=0)
    starred_count = models.IntegerField(default=0)

    is_creator = models.BooleanField(default=False)
    stars = models.ManyToManyField("self", symmetrical=False, related_name="starred_by")
    fcm_token = models.TextField(
        blank=True,
        null=True,
    )

    def generate_verification_code(self):
        self.verification_code = get_random_string(48)
        self.save(update_fields=["verification_code"])
        return self.verification_code

    def __str__(self):
        return self.username

class BlockedUser(models.Model):
    user = models.ForeignKey(
        User,
        related_name="blocked_users",
        on_delete=models.CASCADE
    )

    blocked_user = models.ForeignKey(
        User,
        related_name="blocked_by",
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
      ordering = ["-created_at"]

class MutedUser(models.Model):
    user = models.ForeignKey(
        User,
        related_name="muted_users",
        on_delete=models.CASCADE
    )

    muted_user = models.ForeignKey(
        User,
        related_name="muted_by",
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
  
    class Meta:
      ordering = ["-created_at"]

class PrivacySettings(models.Model):
    PROFILE_VISIBILITY = (
        ("public", "Public"),
        ("members", "Members Only"),
        ("private", "Private"),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="privacy_settings"
    )

    profile_visibility = models.CharField(
        max_length=20,
        choices=PROFILE_VISIBILITY,
        default="public"
    )

    location_visible = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

class ConnectionRequest(models.Model):
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_requests")
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_requests")
    status = models.CharField(max_length=20, choices=[
        ("pending", "pending"),
        ("accepted", "accepted"),
        ("rejected", "rejected"),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def accepted_connections(self):
        sent = ConnectionRequest.objects.filter(
            from_user=self,
            status="accepted"
        ).values_list("to_user", flat=True)
    
        received = ConnectionRequest.objects  .filter(
            to_user=self,
            status="accepted"
        ).values_list("from_user", flat=True)
    
        return User.objects.filter(id__in=list(sent) + list(received))

    @property
    def pending_sent(self):
        return self.sent_requests.filter(status="pending")

    @property
    def pending_received(self):
        return self.received_requests.filter(status="pending")

# ⭐ Star Users (favorite creators)
class Star(models.Model):

    star = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="stars_given",
        on_delete=models.CASCADE
    )

    starred_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="stars_received",
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
      unique_together = ("star", "starred_user")
      indexes = [
          models.Index(fields=["star"]),
          models.Index(fields=["starred_user"]),
      ]

    def is_starred_by(self, user):
      return self.starred_by.filter(id=user.id).exists()

    @property
    def display_name(self):
      return self.star.full_name if self.star.full_name else self.star.username

    def __str__(self):
        return f"{self.star.username} starred {self.starred_user.username}"

class SavedLoginDevice(models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="devices")
    session_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    refresh_token_hash = models.CharField(max_length=255, null=True, blank=True)

    device_fingerprint = models.CharField(max_length=255, null=True, blank=True)
    device_id = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255, blank=True, null=True)  # e.g. "iPhone 14", "Chrome Windows"
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_used = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_trusted = models.BooleanField(default=True)

class UserDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    device_id = models.CharField(max_length=255, unique=True)
    device_name = models.CharField(max_length=255)

    public_key = models.TextField()

    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(auto_now=True)

    created_at = models.DateTimeField(auto_now_add=True)

class UserInterest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="interests",
    )

    topic = models.CharField(max_length=50)

    score = models.FloatField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "topic")