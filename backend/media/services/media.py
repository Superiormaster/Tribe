from rest_framework.exceptions import ValidationError

from media.models import MediaAsset


def get_owned_ready_asset(
    *,
    media_id,
    user,
    media_type,
):
    if not media_id:
        return None

    try:
        asset = MediaAsset.objects.get(
            media_id=media_id,
        )
    except MediaAsset.DoesNotExist:
        raise ValidationError(
            {
                "media": (
                    f"Media asset '{media_id}' "
                    "does not exist."
                )
            }
        )

    # --------------------------------
    # SECURITY
    # --------------------------------

    if asset.user_id != user.id:
        raise ValidationError(
            {
                "media": (
                    "You do not own this media asset."
                )
            }
        )

    # --------------------------------
    # PROCESSING
    # --------------------------------

    if asset.status != "ready":
        raise ValidationError(
            {
                "media": (
                    "Media is still processing."
                )
            }
        )

    # --------------------------------
    # TYPE
    # --------------------------------

    if asset.media_type != media_type:
        raise ValidationError(
            {
                "media": (
                    f"Expected {media_type} media."
                )
            }
        )

    return asset