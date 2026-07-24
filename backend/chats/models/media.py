from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from communities.models import Tribe

User = get_user_model()

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