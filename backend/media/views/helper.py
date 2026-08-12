# media/views/helper.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import MediaAsset

from ..services.r2 import (
    abort_multipart_upload,
    list_multipart_parts,
    media_response,
)

def get_user_media_asset(request, media_id):
    """
    Safely retrieve a MediaAsset belonging to the
    authenticated user.

    Never allow a user to operate on another user's
    multipart upload.
    """

    if not media_id:
        return None, Response(
            {
                "detail": "media_id is required."
            },
            status=400,
        )

    try:

        asset = MediaAsset.objects.get(
            media_id=media_id,
            user=request.user,
        )

    except MediaAsset.DoesNotExist:

        return None, Response(
            {
                "detail":
                    "Media asset not found."
            },
            status=404,
        )

    return asset, None

def validate_multipart_parts(parts):
    """
    Validate the parts supplied by the browser.

    Expected format:

    [
        {
            "part_number": 1,
            "etag": "abc..."
        },
        {
            "part_number": 2,
            "etag": "def..."
        }
    ]

    The browser's parts are NEVER trusted directly.
    They are later compared against R2.
    """

    if not isinstance(parts, list):

        return None, Response(
            {
                "detail":
                    "parts must be an array."
            },
            status=400,
        )

    if not parts:

        return None, Response(
            {
                "detail":
                    "No multipart parts were provided."
            },
            status=400,
        )

    clean_parts = []

    seen_numbers = set()

    for part in parts:

        if not isinstance(part, dict):

            return None, Response(
                {
                    "detail":
                        "Invalid multipart part."
                },
                status=400,
            )

        try:

            part_number = int(
                part.get("part_number")
            )

        except (
            TypeError,
            ValueError,
        ):

            return None, Response(
                {
                    "detail":
                        "Invalid part number."
                },
                status=400,
            )

        if (
            part_number < 1
            or part_number > 10000
        ):

            return None, Response(
                {
                    "detail":
                        "Invalid part number."
                },
                status=400,
            )

        if part_number in seen_numbers:

            return None, Response(
                {
                    "detail":
                        "Duplicate part number."
                },
                status=400,
            )

        seen_numbers.add(
            part_number
        )

        etag = part.get("etag")

        if not etag:

            return None, Response(
                {
                    "detail":
                        "Missing part ETag."
                },
                status=400,
            )

        clean_parts.append({
            "part_number":
                part_number,

            "etag":
                str(etag).strip('"'),
        })

    clean_parts.sort(
        key=lambda item:
            item["part_number"]
    )

    return clean_parts, None

def verify_multipart_parts(
    *,
    object_key,
    upload_id,
    requested_parts,
):
    """
    Compare browser-supplied ETags against
    the parts that actually exist in R2.

    This prevents a client from submitting
    arbitrary/fake ETags.
    """

    uploaded_parts = list_multipart_parts(
        object_key=object_key,
        upload_id=upload_id,
    )

    uploaded_map = {}

    for part in uploaded_parts:

        part_number = int(
            part["part_number"]
        )

        etag = str(
            part["etag"]
        ).strip('"')

        uploaded_map[
            part_number
        ] = etag

    verified_parts = []

    for part in requested_parts:

        number = part[
            "part_number"
        ]

        received_etag = str(
            part["etag"]
        ).strip('"')

        actual_etag = uploaded_map.get(
            number
        )

        if actual_etag is None:

            return None, (
                f"Part {number} "
                f"was not uploaded."
            )

        if actual_etag != received_etag:

            return None, (
                f"Invalid ETag for "
                f"part {number}."
            )

        verified_parts.append({
            "part_number":
                number,

            "etag":
                actual_etag,
        })

    return verified_parts, None

def get_uploaded_parts(
    *,
    object_key,
    upload_id,
):
    """
    Return the parts currently stored by R2.

    This is primarily used by resume.
    """

    parts = list_multipart_parts(
        object_key=object_key,
        upload_id=upload_id,
    )

    normalized = []

    for part in parts:

        normalized.append({
            "part_number":
                int(part["part_number"]),

            "etag":
                str(
                    part["etag"]
                ).strip('"'),

            "size":
                int(
                    part.get(
                        "size",
                        0,
                    )
                ),
        })

    normalized.sort(
        key=lambda item:
            item["part_number"]
    )

    return normalized

class CancelMultipartUploadView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request):

        media_id = request.data.get(
            "media_id"
        )

        asset, error = get_user_media_asset(
            request,
            media_id,
        )

        if error:
            return error

        if asset.status == "cancelled":

            return Response({
                "success": True,
                "media_id":
                    asset.media_id,
                "status":
                    "cancelled",
            })

        if asset.status == "ready":

            return Response(
                {
                    "detail":
                        "Media upload is already complete."
                },
                status=400,
            )

        if asset.multipart_upload_id:

            try:

                abort_multipart_upload(
                    object_key=
                        asset.object_key,

                    upload_id=
                        asset.multipart_upload_id,
                )

            except Exception as exc:

                return Response(
                    {
                        "detail":
                            "Could not cancel "
                            "the multipart upload.",

                        "error":
                            str(exc),
                    },
                    status=500,
                )

        asset.status = "cancelled"

        asset.multipart_upload_id = None

        asset.save(
            update_fields=[
                "status",
                "multipart_upload_id",
                "updated_at",
            ]
        )

        return Response({
            "success": True,
            "media_id":
                asset.media_id,
            "status":
                "cancelled",
        })

class AbortMultipartUploadView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request):

        media_id = request.data.get(
            "media_id"
        )

        asset, error = get_user_media_asset(
            request,
            media_id,
        )

        if error:
            return error

        if asset.multipart_upload_id:

            try:

                abort_multipart_upload(
                    object_key=
                        asset.object_key,

                    upload_id=
                        asset.multipart_upload_id,
                )

            except Exception as exc:

                return Response(
                    {
                        "detail":
                            "Could not abort "
                            "multipart upload.",

                        "error":
                            str(exc),
                    },
                    status=500,
                )

        asset.delete()

        return Response({
            "success": True,
            "media_id":
                media_id,
            "status":
                "aborted",
        })

class ResumeMultipartUploadView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request):

        media_id = request.data.get(
            "media_id"
        )

        asset, error = get_user_media_asset(
            request,
            media_id,
        )

        if error:
            return error

        if asset.status == "ready":

            return Response(
                media_response(
                    asset,

                    completed=True,
                )
            )

        if not asset.multipart_upload_id:

            return Response(
                {
                    "detail":
                        "Multipart upload session "
                        "does not exist."
                },
                status=400,
            )

        try:
            uploaded_parts = (
                get_uploaded_parts(
                    object_key=
                        asset.object_key,
                    upload_id=
                        asset.multipart_upload_id,
                )
            )

        except Exception as exc:

            return Response(
                {
                    "detail":
                        "Could not inspect "
                        "multipart upload.",
                    "error":
                        str(exc),
                },
                status=500,
            )

        uploaded_bytes = sum(
            part["size"]
            for part in uploaded_parts
        )

        return Response({
            "success": True,
            "completed":
                False,
            "media_id":
                asset.media_id,
            "object_key":
                asset.object_key,
            "upload_id":
                asset.multipart_upload_id,
            "original_url":
                asset.original_url,
            "thumbnail_url":
                asset.thumbnail_url,
            "media_type":
                asset.media_type,
            "content_type":
                asset.content_type,
            "size":
                asset.size,
            "status":
                asset.status,
            "uploaded_bytes":
                uploaded_bytes,
            "uploaded_parts":
                uploaded_parts,
        })

class MediaUploadDebugView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        event = request.data.get("event")
        level = request.data.get("level", "info")
        media_id = request.data.get("media_id")
        part_number = request.data.get("part_number")
        data = request.data.get("data")

        print(
            "\n"
            "==================================================\n"
            "=== FRONTEND MEDIA UPLOAD DEBUG ===\n"
            f"EVENT: {event}\n"
            f"LEVEL: {level}\n"
            f"MEDIA ID: {media_id}\n"
            f"PART: {part_number}\n"
            f"DATA: {data}\n"
            "==================================================\n",
            flush=True,
        )

        return Response({
            "success": True,
        })