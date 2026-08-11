# media/tasks.py

from celery import shared_task

from .models import MediaAsset
from .services.thumbnail import (
    generate_image_thumbnail,
    generate_video_thumbnail,
)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def generate_media_thumbnail(self, asset_id):

    try:
        asset = MediaAsset.objects.get(
            id=asset_id
        )

    except MediaAsset.DoesNotExist:
        return {
            "success": False,
            "error": "Media asset not found.",
        }

    # Don't process cancelled/invalid uploads
    if asset.status != "ready":
        return {
            "success": False,
            "error": "Media is not ready.",
        }

    # Already generated
    if asset.thumbnail_url:
        return {
            "success": True,
            "thumbnail_url": asset.thumbnail_url,
        }

    try:

        if asset.media_type in {
            "image",
            "gif",
            "sticker",
        }:

            thumbnail_url = generate_image_thumbnail(
                asset
            )

        elif asset.media_type == "video":

            thumbnail_url = generate_video_thumbnail(
                asset
            )

        else:

            return {
                "success": True,
                "thumbnail_url": None,
            }

        if not thumbnail_url:
            raise ValueError(
                "Thumbnail generator returned no URL."
            )

        # IMPORTANT:
        # Use the same data type your MediaAsset model expects.
        asset.thumbnail_url = [
            thumbnail_url
        ]

        asset.save(
            update_fields=[
                "thumbnail_url",
                "updated_at",
            ]
        )

        return {
            "success": True,
            "thumbnail_url": [
                thumbnail_url
            ],
        }

    except Exception as exc:

        raise self.retry(
            exc=exc,
            countdown=10,
        )