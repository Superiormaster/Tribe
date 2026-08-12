from rest_framework.exceptions import ValidationError

from media.models import MediaAsset


def get_owned_ready_asset(
    *,
    media_id,
    user,
    media_type,
):
    """
    Return a media asset that:
    - exists
    - belongs to the authenticated user
    - has finished uploading
    - matches the expected media type

    Thumbnail processing is intentionally NOT checked here.
    A post can be created as soon as the original media is ready.
    """

    if not media_id:
        raise ValidationError({
            "media": "media_id is required."
        })

    try:
        asset = MediaAsset.objects.get(
            media_id=media_id,
        )
    except MediaAsset.DoesNotExist:
        raise ValidationError({
            "media": (
                f"Media asset '{media_id}' "
                "does not exist."
            )
        })

    if asset.user_id != user.id:
        raise ValidationError({
            "media": (
                "You do not own this media asset."
            )
        })

    if asset.status != "ready":
        if asset.status == "pending":
            message = (
                "Media upload is still in progress."
            )

        elif asset.status == "processing":
            message = (
                "Media is still being processed."
            )

        elif asset.status == "failed":
            message = (
                "Media processing failed."
            )

        elif asset.status == "cancelled":
            message = (
                "Media upload was cancelled."
            )

        else:
            message = (
                f"Media is not ready. "
                f"Current status: {asset.status}."
            )

        raise ValidationError({
            "media": message
        })

    if asset.media_type != media_type:
        raise ValidationError({
            "media": (
                f"Expected {media_type} media, "
                f"but received {asset.media_type}."
            )
        })

    print(
        "MEDIA READY FOR POST:",
        {
            "media_id": asset.media_id,
            "status": asset.status,
            "thumbnail_status": asset.thumbnail_status,
            "user_id": asset.user_id,
            "expected_type": media_type,
            "actual_type": asset.media_type,
            "multipart_upload_id": asset.multipart_upload_id,
        }
    )

    return asset