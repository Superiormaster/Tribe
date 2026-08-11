from rest_framework.exceptions import ValidationError

from media.models import MediaAsset
from media.services.media import get_owned_ready_asset
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

        try:
            asset = get_owned_ready_asset(
                media_id=media_id,
                user=user,
                media_type=(
                  "video"
                  if post.content_type in ["short_video", "long_video"]
                  else "image"
              ),
            )
        except MediaAsset.DoesNotExist:
            raise ValidationError(
                {"media_files": "Media asset not found."}
            )

        # --------------------------------
        # SECURITY
        # --------------------------------

        if asset.user_id != user.id:
            raise ValidationError(
                {"media_files": "You do not own this media."}
            )

        # --------------------------------
        # MUST BE READY
        # --------------------------------

        if asset.status != "ready":
            raise ValidationError(
                {
                    "media_files": (
                        f"Media {asset.media_id} "
                        "is not ready."
                    )
                }
            )

        # --------------------------------
        # TYPE MUST MATCH
        # --------------------------------

        if asset.media_type != requested_type:
            raise ValidationError(
                {"media_files": "Media type mismatch."}
            )

        # --------------------------------
        # CREATE RELATION
        # --------------------------------

        PostMedia.objects.create(
            post=post,
            asset=asset,
            media_type=asset.media_type,

            # Legacy compatibility
            file=asset.original_url,
            thumbnail=asset.thumbnail_url,
        )