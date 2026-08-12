from rest_framework.exceptions import ValidationError

from media.models import MediaAsset
from .models import PostMedia


ALLOWED_POST_MEDIA_TYPES = {
    "image",
    "video",
}


def attach_post_media(
    *,
    post,
    user,
    media_files,
):
    if not isinstance(media_files, list):
        raise ValidationError(
            {"media_files": "media_files must be a list."}
        )

    for item in media_files:

        media_id = item.get("media_id")
        requested_type = item.get("media_type")

        if not media_id:
            raise ValidationError(
                {"media_files": "media_id is required."}
            )

        if requested_type not in ALLOWED_POST_MEDIA_TYPES:
            raise ValidationError(
                {"media_files": "Invalid media type."}
            )

        # Get the user's media asset
        try:
            asset = MediaAsset.objects.get(
                media_id=media_id,
                user=user,
            )
        except MediaAsset.DoesNotExist:
            raise ValidationError(
                {
                    "media_files": (
                        f"Media asset '{media_id}' "
                        "does not exist or does not belong to you."
                    )
                }
            )

        # Media must be fully uploaded
        if asset.status != "ready":
            raise ValidationError(
                {
                    "media_files": (
                        f"Media {asset.media_id} "
                        f"is not ready. "
                        f"Current status: {asset.status}"
                    )
                }
            )

        # Media type must match the request
        if asset.media_type != requested_type:
            raise ValidationError(
                {
                    "media_files": (
                        f"Media type mismatch. "
                        f"Expected {requested_type}, "
                        f"got {asset.media_type}."
                    )
                }
            )

        # For video posts, make sure the asset is actually video
        expected_asset_type = (
            "video"
            if post.content_type in ["short_video", "long_video"]
            else "image"
        )

        if asset.media_type != expected_asset_type:
            raise ValidationError(
                {
                    "media_files": (
                        f"This post requires {expected_asset_type} media."
                    )
                }
            )

        # Attach media to post
        PostMedia.objects.create(
            post=post,
            asset=asset,
            media_type=asset.media_type,

            # Legacy compatibility
            file=asset.original_url,
            thumbnail=asset.thumbnail_url,
        )