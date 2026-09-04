from django.core.exceptions import ValidationError

from project.celery import app as celery_app
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from ..models import MediaAsset
from ..tasks import generate_media_thumbnail

from ..services.r2 import (
    get_object_metadata,
    delete_object,
    get_public_url,
    complete_multipart_upload,
    list_multipart_parts,
    initialize_media_upload,
    media_response,
)

def get_user_media(request, media_id):
    """
    Safely retrieve media belonging to the authenticated user.
    """

    if not media_id:
        return None

    try:
        return MediaAsset.objects.get(
            media_id=media_id,
            user=request.user,
        )
    except MediaAsset.DoesNotExist:
        return None

class InitializeMediaUploadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        content_type = request.data.get("content_type")
        size = request.data.get("size", 0)
        upload_mode = request.data.get("upload_mode")
        duration = request.data.get("duration")

        if not content_type:
            return Response(
                {"detail": "content_type is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if upload_mode not in {
            "direct",
            "multipart",
        }:
            return Response(
                {
                    "detail":
                        "upload_mode must be direct or multipart."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # CLIENT DURATION
        # ----------------------------------------------------

        if duration is not None:

            try:
                duration = float(duration)

                if duration < 0:
                    raise ValueError

            except (TypeError, ValueError):

                return Response(
                    {"detail": "Invalid duration."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        else:
            duration = None

        # ----------------------------------------------------
        # FILE SIZE
        # ----------------------------------------------------

        try:
            size = int(size)

        except (TypeError, ValueError):

            return Response(
                {"detail": "Invalid file size."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            result = initialize_media_upload(
                user=request.user,
                content_type=content_type,
                size=size,
                duration=duration,
                upload_mode=upload_mode,
            )

        except ValidationError as e:

            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            result,
            status=status.HTTP_201_CREATED,
        )

class CompleteMediaUploadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        media_id = request.data.get(
            "media_id"
        )

        if not media_id:

            return Response(
                {
                    "detail":
                        "media_id is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset = get_user_media(
            request,
            media_id,
        )

        print(
          "=== MEDIA COMPLETE START ===",
          {
              "media_id": media_id,
              "user_id": request.user.id,
              "status": asset.status if asset else None,
              "multipart_upload_id": (
                  asset.multipart_upload_id
                  if asset
                  else None
              ),
          },
          flush=True,
        )
  
        print(
            "=== MEDIA OBJECT KEY ===",
            asset.object_key if asset else None,
            flush=True,
        )

        if not asset:

            return Response(
                {
                    "detail":
                        "Media asset not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if asset.multipart_upload_id:

            return Response(
                {
                    "detail":
                        "This media uses multipart upload. "
                        "Use the multipart complete endpoint."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if asset.status == "ready":

            return Response(
              media_response(
                  asset,
                  thumbnail_status=getattr(
                      asset,
                      "thumbnail_status",
                      None,
                  ),
              )
            )

        try:

            metadata = get_object_metadata(
                asset.object_key
            )
        
        except Exception as exc:
        
            print(
                "=== R2 OBJECT VERIFY FAILED ===",
                flush=True,
            )
        
            print(
                "MEDIA ID:",
                asset.media_id,
                flush=True,
            )
        
            print(
                "OBJECT KEY:",
                asset.object_key,
                flush=True,
            )
        
            print(
                "BUCKET:",
                R2_BUCKET_NAME,
                flush=True,
            )
        
            print(
                "R2 ENDPOINT:",
                R2_ENDPOINT_URL,
                flush=True,
            )
        
            print(
                "ERROR TYPE:",
                type(exc).__name__,
                flush=True,
            )
        
            print(
                "ERROR:",
                repr(exc),
                flush=True,
            )
        
            print(
              "=== R2 VERIFY ERROR ===",
              {
                  "media_id": asset.media_id,
                  "object_key": asset.object_key,
                  "error_type": type(exc).__name__,
                  "error": repr(exc),
              },
              flush=True,
            )
        
            return Response(
                {
                    "detail":
                        "Uploaded file was not found.",
        
                    "error":
                        str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        size = metadata.get(
            "ContentLength",
            0,
        )

        content_type = metadata.get(
            "ContentType",
            "",
        )

        if size <= 0:

            return Response(
                {
                    "detail":
                        "Invalid uploaded file."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if content_type != asset.content_type:

            return Response(
                {
                    "detail":
                        "Uploaded content type does not match."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset.size = size

        asset.content_type = content_type

        asset.status = "ready"

        if hasattr(
            asset,
            "thumbnail_status",
        ):
            asset.thumbnail_status = "processing"

            asset.save(
                update_fields=[
                    "size",
                    "content_type",
                    "status",
                    "thumbnail_status",
                    "updated_at",
                ]
            )

        else:

            asset.save(
                update_fields=[
                    "size",
                    "content_type",
                    "status",
                    "updated_at",
                ]
            )
  
        if asset.media_type in {
            "image",
            "video",
        }:

            try:
                generate_media_thumbnail.delay(asset.id)
            except Exception as exc:
                print(
                    "THUMBNAIL QUEUE FAILED:",
                    repr(exc),
                    flush=True,
                )

            asset.thumbnail_status = "processing"
            asset.save(
                update_fields=[
                    "thumbnail_status",
                    "updated_at",
                ]
            )
            thumbnail_status = "processing"

        else:

            thumbnail_status = "none"

        return Response(
          media_response(
              asset,
              thumbnail_status=thumbnail_status,
          )
        )

class CompleteMultipartMediaUploadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        media_id = request.data.get(
            "media_id"
        )

        parts = request.data.get(
            "parts"
        )

        if not media_id:

            return Response(
                {
                    "detail":
                        "media_id is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(parts, list):

            return Response(
                {
                    "detail":
                        "parts must be an array."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not parts:

            return Response(
                {
                    "detail":
                        "No multipart parts were provided."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset = get_user_media(
            request,
            media_id,
        )

        if not asset:

            return Response(
                {
                    "detail":
                        "Media asset not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if asset.status == "ready":

            return Response(
              media_response(
                  asset,
                  thumbnail_status=getattr(
                      asset,
                      "thumbnail_status",
                      None,
                  ),
              )
            )

        upload_id = asset.multipart_upload_id

        if not upload_id:

            return Response(
                {
                    "detail":
                        "Multipart upload session not found."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        clean_parts = []

        seen_numbers = set()

        for part in parts:

            if not isinstance(part, dict):

                return Response(
                    {
                        "detail":
                            "Invalid multipart part."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:

                part_number = int(
                    part.get(
                        "part_number"
                    )
                )

            except (
                TypeError,
                ValueError,
            ):

                return Response(
                    {
                        "detail":
                            "Invalid part number."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            etag = part.get(
                "etag"
            )

            if not etag:

                return Response(
                    {
                        "detail":
                            "Missing part ETag."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # R2/S3 supports max 10,000 parts
            if (
                part_number < 1
                or part_number > 10000
            ):

                return Response(
                    {
                        "detail":
                            "Invalid part number."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if part_number in seen_numbers:

                return Response(
                    {
                        "detail":
                            "Duplicate part number."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            seen_numbers.add(
                part_number
            )

            clean_parts.append(
                {
                    "part_number":
                        part_number,

                    "etag":
                        str(etag)
                            .strip('"'),
                }
            )

        clean_parts.sort(
            key=lambda item:
                item["part_number"]
        )

        try:

            uploaded_parts = (
                list_multipart_parts(
                    object_key=
                        asset.object_key,

                    upload_id=
                        upload_id,
                )
            )
            
            print(
              "=== R2 PARTS FOUND ===",
              {
                  "media_id": asset.media_id,
                  "parts_count": len(uploaded_parts),
                  "parts": uploaded_parts,
              },
              flush=True,
            )

        except Exception as exc:

            return Response(
                {
                    "detail":
                        "Could not inspect multipart upload.",

                    "error":
                        str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_map = {
            int(part["part_number"]):
                str(part["etag"])
                    .strip('"')

            for part in uploaded_parts
        }

        for part in clean_parts:

            number = part[
                "part_number"
            ]

            received_etag = (
                str(
                    part["etag"]
                )
                .strip('"')
            )

            expected_etag = (
                uploaded_map.get(
                    number
                )
            )

            if expected_etag is None:

                return Response(
                    {
                        "detail":
                            f"Part {number} "
                            "was not uploaded."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if (
                expected_etag
                != received_etag
            ):

                return Response(
                    {
                        "detail":
                            f"Invalid ETag "
                            f"for part {number}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:

            complete_multipart_upload(
                object_key=
                    asset.object_key,

                upload_id=
                    upload_id,

                parts=
                    clean_parts,
            )

        except Exception as exc:

            return Response(
                {
                    "detail":
                        "Could not complete "
                        "multipart upload.",

                    "error":
                        str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            metadata = get_object_metadata(
                asset.object_key
            )

        except Exception:

            return Response(
                {
                    "detail":
                        "Multipart upload completed "
                        "but the final object could "
                        "not be verified."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        final_size = metadata.get(
            "ContentLength",
            0,
        )

        final_content_type = metadata.get(
            "ContentType",
            "",
        )

        if final_size <= 0:

            return Response(
                {
                    "detail":
                        "Final uploaded file is invalid."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            final_content_type
            != asset.content_type
        ):

            return Response(
                {
                    "detail":
                        "Final content type does not match."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset.size = final_size

        asset.content_type = (
            final_content_type
        )

        asset.status = "ready"

        asset.multipart_upload_id = None

        if asset.media_type in {
            "image",
            "video",
        }:

            if hasattr(
                asset,
                "thumbnail_status",
            ):

                asset.thumbnail_status = (
                    "processing"
                )

                asset.save(
                    update_fields=[
                        "size",
                        "content_type",
                        "status",
                        "multipart_upload_id",
                        "thumbnail_status",
                        "updated_at",
                    ]
                )

            else:

                asset.save(
                    update_fields=[
                        "size",
                        "content_type",
                        "status",
                        "multipart_upload_id",
                        "updated_at",
                    ]
                )

            print(
                "=== BEFORE CELERY THUMBNAIL TASK ===",
                flush=True,
            )
            
            try:
            
                connection = celery_app.connection_for_write()
            
                print(
                    "=== CELERY CONNECTION DEBUG ===",
                    flush=True,
                )
            
                print(
                    "BROKER URL:",
                    connection.as_uri(),
                    flush=True,
                )
            
                connection.ensure_connection(
                    max_retries=1
                )
            
                print(
                    "CELERY PRODUCER CONNECTION: SUCCESS",
                    flush=True,
                )
            
            except Exception as e:
            
                print(
                    "CELERY PRODUCER CONNECTION: FAILED",
                    repr(e),
                    flush=True,
                )
            
                raise
            
            try:
                generate_media_thumbnail.delay(asset.id)
            except Exception as exc:
                print(
                    "THUMBNAIL QUEUE FAILED:",
                    repr(exc),
                    flush=True,
                )
            
            print(
                "=== CELERY TASK DISPATCHED ===",
                flush=True,
            )
  
            asset.thumbnail_status = "processing"
            asset.save(
                update_fields=[
                    "thumbnail_status",
                    "updated_at",
                ]
            )
            thumbnail_status = "processing"

        else:

            asset.save(
                update_fields=[
                    "size",
                    "content_type",
                    "status",
                    "multipart_upload_id",
                    "updated_at",
                ]
            )

            thumbnail_status = "none"

        return Response(
          media_response(
              asset,
              thumbnail_status=thumbnail_status,
          )
        )