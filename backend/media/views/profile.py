# media/views/profile.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import MediaAsset
from ..services.r2 import (
    get_object_metadata,
    delete_object,
    initialize_profile_media_upload,
)

def get_single_url(value):
    if isinstance(value, list):
        return value[0] if value else None

    return value

PROFILE_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_AVATAR_SIZE = 5 * 1024 * 1024
MAX_COVER_SIZE = 10 * 1024 * 1024

PROFILE_TYPES = {
    "avatar",
    "cover",
}

def get_profile_max_size(profile_type: str) -> int:
    if profile_type == "avatar":
        return MAX_AVATAR_SIZE

    return MAX_COVER_SIZE


def get_profile_object_prefix(
    user_id: int,
    profile_type: str,
) -> str:
    return (
        f"users/{user_id}/profile/"
        f"{profile_type}/"
    )

class InitializeProfileMediaUploadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        profile_type = request.data.get(
            "media_type"
        )

        content_type = request.data.get(
            "content_type"
        )

        size = request.data.get(
            "size"
        )

        if profile_type not in PROFILE_TYPES:

            return Response(
                {
                    "detail":
                        "Invalid profile media type."
                },
                status=400,
            )

        if content_type not in PROFILE_IMAGE_TYPES:

            return Response(
                {
                    "detail": (
                        "Only JPEG, PNG and WebP "
                        "images are supported."
                    )
                },
                status=400,
            )

        try:

            size = int(size)

        except (
            TypeError,
            ValueError,
        ):

            return Response(
                {
                    "detail":
                        "Invalid file size."
                },
                status=400,
            )

        max_size = get_profile_max_size(
            profile_type
        )

        if size <= 0:

            return Response(
                {
                    "detail":
                        "File size must be greater than zero."
                },
                status=400,
            )

        if size > max_size:

            return Response(
                {
                    "detail":
                        "File is too large."
                },
                status=400,
            )

        try:

            result = (
            initialize_profile_media_upload(
                user=request.user,
                profile_type=profile_type,
                content_type=content_type,
                size=size,
              )
            )

        except Exception as e:

            return Response(
                {
                    "detail":
                        "Could not initialize "
                        "profile media upload.",
                    "error":
                        str(e),
                },
                status=400,
            )

        return Response(
            {
                **result,
                "profile_type":
                    profile_type,
            },
            status=201,
        )

class CompleteProfileMediaUploadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        profile_type = request.data.get(
            "media_type"
        )

        object_key = request.data.get(
            "object_key"
        )

        media_id = request.data.get(
            "media_id"
        )

        if profile_type not in PROFILE_TYPES:

            return Response(
                {
                    "detail":
                        "Invalid profile media type."
                },
                status=400,
            )

        if not object_key or not media_id:

            return Response(
                {
                    "detail":
                        "media_id and object_key "
                        "are required."
                },
                status=400,
            )

        expected_prefix = (
            get_profile_object_prefix(
                request.user.id,
                profile_type,
            )
        )

        if not object_key.startswith(
            expected_prefix
        ):

            return Response(
                {
                    "detail":
                        "Invalid object key."
                },
                status=403,
            )

        try:

            asset = MediaAsset.objects.get(
                user=request.user,
                media_id=media_id,
                object_key=object_key,
            )

        except MediaAsset.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Media asset not found."
                },
                status=404,
            )

        if asset.status == "ready":

            return Response({
                "success": True,

                "media_id":
                    asset.media_id,

                "media_type":
                    profile_type,

                "url":
                  get_single_url(asset.original_url),
                "original_url":
                  get_single_url(asset.original_url),
  
                "object_key":
                    asset.object_key,

                "thumbnail_url":
                    asset.thumbnail_url,
            })

        try:

            metadata = get_object_metadata(
                object_key
            )

        except Exception:

            return Response(
                {
                    "detail":
                        "Uploaded file was not found."
                },
                status=400,
            )

        content_type = metadata.get(
            "ContentType",
            "",
        )

        size = metadata.get(
            "ContentLength",
            0,
        )

        if content_type not in PROFILE_IMAGE_TYPES:

            try:
                delete_object(
                    object_key
                )
            except Exception:
                pass

            asset.status = "failed"

            asset.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "detail":
                        "Invalid uploaded "
                        "file type."
                },
                status=400,
            )

        max_size = get_profile_max_size(
            profile_type
        )

        if size <= 0:

            return Response(
                {
                    "detail":
                        "Invalid uploaded file."
                },
                status=400,
            )

        if size > max_size:

            try:
                delete_object(
                    object_key
                )
            except Exception:
                pass

            asset.status = "failed"

            asset.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "detail":
                        "Uploaded file is too large."
                },
                status=400,
            )

        if asset.content_type != content_type:

            try:
                delete_object(
                    object_key
                )
            except Exception:
                pass

            asset.status = "failed"

            asset.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "detail":
                        "Uploaded content type "
                        "does not match."
                },
                status=400,
            )

        asset.content_type = content_type
        asset.size = size
        asset.status = "ready"

        asset.save(
            update_fields=[
                "content_type",
                "size",
                "status",
                "updated_at",
            ]
        )

        user = request.user

        if profile_type == "avatar":

            old_asset = user.avatar_asset

            user.avatar_asset = asset

            # Legacy compatibility
            user.avatar = get_single_url(asset.original_url)

            user.save(
                update_fields=[
                    "avatar_asset",
                    "avatar",
                ]
            )

        else:

            old_asset = user.cover_asset

            user.cover_asset = asset

            # Legacy compatibility
            user.cover_photo = get_single_url(asset.original_url)

            user.save(
                update_fields=[
                    "cover_asset",
                    "cover_photo",
                ]
            )

        if (
            old_asset
            and old_asset.pk != asset.pk
        ):

            try:

                delete_object(
                    old_asset.object_key
                )

            except Exception:

                # Do not fail the new upload
                # simply because old cleanup failed.
                pass

            try:

                old_asset.delete()

            except Exception:

                pass

        return Response({

            "success":
                True,

            "media_id":
                asset.media_id,

            "media_type":
                profile_type,

            "url": get_single_url(asset.original_url),
            "original_url": get_single_url(asset.original_url),
  
            "object_key":
                asset.object_key,

            "thumbnail_url":
                asset.thumbnail_url,

            "content_type":
                asset.content_type,

            "size":
                asset.size,

            "status":
                asset.status,
        })