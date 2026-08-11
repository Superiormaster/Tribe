from django.db import models
from django.conf import settings

class MediaAsset(models.Model):

    MEDIA_TYPES = (
        ("image", "Image"),
        ("video", "Video"),
        ("audio", "Audio"),
        ("gif", "GIF"),
        ("sticker", "Sticker"),
    )

    STATUS_CHOICES = (
        ("uploaded", "Uploaded"),
        ("processing", "Processing"),
        ("ready", "Ready"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    )
  
    THUMBNAIL_STATUS = (
        ("none", "None"),
        ("processing", "Processing"),
        ("ready", "Ready"),
        ("failed", "Failed"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="media_assets",
    )

    media_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
    )
  
    multipart_upload_id = models.CharField(
        max_length=300,
        blank=True,
        null=True,
        db_index=True,
    )
  
    multipart_part_size = models.PositiveBigIntegerField(
        default=0,
    )

    object_key = models.CharField(
        max_length=500,
        unique=True,
    )

    original_url = models.JSONField(
        default=list,
        blank=True,
    )

    thumbnail_key = models.CharField(
        max_length=500,
        blank=True,
        null=True,
    )

    thumbnail_url = models.JSONField(
        default=list,
        blank=True,
    )

    thumbnail_status = models.CharField(
        max_length=20,
        choices=THUMBNAIL_STATUS,
        default="none",
    )

    media_type = models.CharField(
        max_length=20,
        choices=MEDIA_TYPES,
    )

    content_type = models.CharField(
        max_length=100,
    )

    size = models.BigIntegerField(
        default=0,
    )

    width = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    height = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    duration = models.JSONField(
        default=list,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="uploaded",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.media_id} - {self.media_type}"
