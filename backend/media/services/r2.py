# services/r2.py

import os
import uuid
import math

import boto3

from botocore.config import Config
from django.core.exceptions import ValidationError

from ..models import MediaAsset


R2_ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
R2_ACCESS_KEY_ID = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_ACCESS_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
R2_BUCKET_NAME = os.environ["R2_BUCKET_NAME"]
R2_ENDPOINT_URL = os.environ["R2_ENDPOINT_URL"]
R2_PUBLIC_URL = os.environ["R2_PUBLIC_URL"].rstrip("/")

PART_SIZE = 8 * 1024 * 1024
MULTIPART_THRESHOLD = 8 * 1024 * 1024
MULTIPART_URL_EXPIRES = 7200
MAX_MULTIPART_PARTS = 10_000


r2_client = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT_URL,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
    config=Config(
        signature_version="s3v4",
        retries={
            "max_attempts": 3,
            "mode": "standard",
        },
    ),
)


# ============================================================
# BASIC R2
# ============================================================

def create_presigned_upload_url(
    object_key: str,
    content_type: str,
    expires_in: int = 900,
):
    return r2_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": R2_BUCKET_NAME,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
        HttpMethod="PUT",
    )


def get_public_url(object_key: str) -> str:
    return f"{R2_PUBLIC_URL}/{object_key}"


def object_exists(object_key: str) -> bool:
    try:
        r2_client.head_object(
            Bucket=R2_BUCKET_NAME,
            Key=object_key,
        )
        return True
    except r2_client.exceptions.ClientError:
        return False


def get_object_metadata(object_key: str):
    return r2_client.head_object(
        Bucket=R2_BUCKET_NAME,
        Key=object_key,
    )


def delete_object(object_key: str):
    if not object_key:
        return

    r2_client.delete_object(
        Bucket=R2_BUCKET_NAME,
        Key=object_key,
    )


# ============================================================
# MEDIA DETECTION
# ============================================================

def generate_media_id():
    return uuid.uuid4().hex


def detect_media_type(content_type: str, media_type_hint=None):

    if media_type_hint == "sticker":
        if content_type in {
            "image/png",
            "image/webp",
            "image/gif",
        }:
            return "sticker"

        raise ValidationError(
            "Invalid sticker format."
        )

    if content_type == "image/gif":
        return "gif"

    if content_type.startswith("image/"):
        return "image"

    if content_type.startswith("video/"):
        return "video"

    if content_type.startswith("audio/"):
        return "audio"

    raise ValidationError(
        "Unsupported media type."
    )


def get_extension(content_type: str):

    content_type = (
        content_type
        .split(";", 1)[0]
        .strip()
        .lower()
    )

    mapping = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",

        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",

        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/wav": "wav",
        "audio/webm": "webm",
        "audio/ogg": "ogg",
    }

    return mapping.get(
        content_type,
        content_type.split("/")[-1],
    )


def generate_object_key(
    user_id: int,
    media_type: str,
    content_type: str,
):

    media_id = generate_media_id()

    extension = get_extension(content_type)

    object_key = (
        f"users/{user_id}/media/"
        f"{media_type}/"
        f"{media_id}.{extension}"
    )

    return media_id, object_key

# ============================================================
# MULTIPART HELPERS
# ============================================================

def calculate_part_count(
    size: int,
    part_size: int = PART_SIZE,
) -> int:

    if size <= 0:
        raise ValidationError(
            "Invalid file size."
        )

    count = math.ceil(
        size / part_size
    )

    if count > MAX_MULTIPART_PARTS:

        raise ValidationError(
            "File is too large for multipart upload."
        )

    return count


def create_multipart_upload(
    object_key: str,
    content_type: str,
):

    response = r2_client.create_multipart_upload(
        Bucket=R2_BUCKET_NAME,
        Key=object_key,
        ContentType=content_type,
    )

    return response["UploadId"]

def create_presigned_part_url(
    object_key: str,
    upload_id: str,
    part_number: int,
    expires_in: int = MULTIPART_URL_EXPIRES,
):

    return r2_client.generate_presigned_url(
        "upload_part",
        Params={
            "Bucket": R2_BUCKET_NAME,
            "Key": object_key,
            "UploadId": upload_id,
            "PartNumber": part_number,
        },
        ExpiresIn=expires_in,
        HttpMethod="PUT",
    )


def create_presigned_part_urls(
    object_key: str,
    upload_id: str,
    part_count: int,
):

    urls = []

    for part_number in range(
        1,
        part_count + 1,
    ):

        urls.append({
            "part_number": part_number,
            "upload_url": create_presigned_part_url(
                object_key=object_key,
                upload_id=upload_id,
                part_number=part_number,
            ),
        })

    return urls

def complete_multipart_upload(
    object_key: str,
    upload_id: str,
    parts: list,
):

    formatted_parts = []

    for part in parts:

        part_number = int(
            part["part_number"]
        )

        etag = str(
            part["etag"]
        )

        formatted_parts.append({
            "PartNumber": part_number,
            "ETag": etag,
        })

    formatted_parts.sort(
        key=lambda item: item["PartNumber"]
    )

    return r2_client.complete_multipart_upload(
        Bucket=R2_BUCKET_NAME,
        Key=object_key,
        UploadId=upload_id,
        MultipartUpload={
            "Parts": formatted_parts,
        },
    )


def abort_multipart_upload(
    object_key: str,
    upload_id: str,
):

    if not upload_id:
        return

    try:

        r2_client.abort_multipart_upload(
            Bucket=R2_BUCKET_NAME,
            Key=object_key,
            UploadId=upload_id,
        )

    except Exception:

        # The upload may already have completed/expired.
        pass


def list_multipart_parts(
    *,
    object_key: str,
    upload_id: str,
):

    parts = []

    response = r2_client.list_parts(
        Bucket=R2_BUCKET_NAME,
        Key=object_key,
        UploadId=upload_id,
    )

    for part in response.get(
        "Parts",
        []
    ):

        parts.append({
            "part_number": part["PartNumber"],
            "etag": part["ETag"],
            "size": part["Size"],
        })

    while response.get("IsTruncated"):

        response = r2_client.list_parts(
            Bucket=R2_BUCKET_NAME,
            Key=object_key,
            UploadId=upload_id,
            PartNumberMarker=response["NextPartNumberMarker"],
        )

        for part in response.get("Parts", []):
            parts.append({
                "part_number": part["PartNumber"],
                "etag": part["ETag"],
                "size": part["Size"],
            })

    return parts

# ============================================================
# UNIVERSAL MEDIA INITIALIZATION
# ============================================================

def initialize_media_upload(
    *,
    user,
    content_type: str,
    size: int = 0,
    duration=None,
    upload_mode: str,
    media_type_hint: str = None,
):

    if upload_mode not in {
        "direct",
        "multipart",
    }:
        raise ValidationError(
            "upload_mode must be direct or multipart."
        )

    media_type = detect_media_type(
        content_type,
        media_type_hint,
    )

    media_id, object_key = generate_object_key(
        user.id,
        media_type,
        content_type,
    )

    original_url = get_public_url(
        object_key
    )

    # ========================================================
    # DIRECT UPLOAD
    # ========================================================

    if upload_mode == "direct":

        upload_url = create_presigned_upload_url(
            object_key=object_key,
            content_type=content_type,
        )

        asset = MediaAsset.objects.create(
            user=user,
            media_id=media_id,
            object_key=object_key,
            original_url=[original_url],
            media_type=media_type,
            content_type=content_type,
            size=size or 0,
            duration=duration,
            status="pending",
        )

        return {
            "media_id":
                asset.media_id,
            "upload_url":
                upload_url,
            "object_key":
                asset.object_key,
            "original_url":
                original_url,
            "media_type":
                asset.media_type,
            "content_type":
                asset.content_type,
            "status":
                asset.status,
            "multipart":
                False,
            "duration": asset.duration,
            "upload_mode":
                "direct",
        }

    # ========================================================
    # MULTIPART UPLOAD
    # ========================================================

    if size <= 0:
        raise ValidationError(
            "File size is required for multipart upload."
        )

    part_count = calculate_part_count(
        size
    )

    upload_id = create_multipart_upload(
        object_key=object_key,
        content_type=content_type,
    )

    asset = MediaAsset.objects.create(
        user=user,
        media_id=media_id,
        object_key=object_key,
        original_url=[original_url],
        media_type=media_type,
        content_type=content_type,
        duration=duration,
        size=size,
        multipart_upload_id=upload_id,
        multipart_part_size=PART_SIZE,
        status="pending",
    )

    part_urls = create_presigned_part_urls(
        object_key=object_key,
        upload_id=upload_id,
        part_count=part_count,
    )

    return {
        "media_id":
            asset.media_id,
        "object_key":
            asset.object_key,
        "original_url":
            original_url,
        "media_type":
            asset.media_type,
        "content_type":
            asset.content_type,
        "duration": asset.duration,
        "status":
            asset.status,
        "multipart":
            True,
        "upload_mode":
            "multipart",
        "upload_id":
            upload_id,
        "part_size":
            PART_SIZE,
        "part_count":
            part_count,
        "parts":
            part_urls,
    }

def resume_multipart_media_upload(
    *,
    asset,
):

    if not asset.multipart_upload_id:
        raise ValidationError(
            "This media does not have a multipart upload."
        )

    if not asset.multipart_part_size:
        raise ValidationError(
            "Multipart part size is missing."
        )

    if not asset.size:
        raise ValidationError(
            "Media file size is missing."
        )

    uploaded_parts = list_multipart_parts(
        object_key=asset.object_key,
        upload_id=asset.multipart_upload_id,
    )

    uploaded_numbers = {
        part["part_number"]
        for part in uploaded_parts
    }

    part_count = math.ceil(
        asset.size /
        asset.multipart_part_size
    )

    remaining_parts = []

    for part_number in range(
        1,
        part_count + 1,
    ):

        if part_number in uploaded_numbers:
            continue

        remaining_parts.append({
            "part_number": part_number,
            "upload_url":
                create_presigned_part_url(
                    object_key=
                        asset.object_key,
                    upload_id=
                        asset.multipart_upload_id,
                    part_number=
                        part_number,
                ),
        })

    return {
        "media_id":
            asset.media_id,
        "object_key":
            asset.object_key,
        "upload_id":
            asset.multipart_upload_id,
        "part_size":
            asset.multipart_part_size,
        "part_count":
            part_count,
        "uploaded_parts":
            uploaded_parts,
        "remaining_parts":
            remaining_parts,
        "status":
            asset.status,
    }

def first_url(value):
    if isinstance(value, list):
        return value[0] if value else None

    return value

def media_response(asset, **extra):
    original_url = asset.original_url

    if isinstance(original_url, list):
        original_url = (
            original_url[0]
            if original_url
            else None
        )

    data = {
        "success": True,
        "id": asset.pk,
        "media_id": asset.media_id,
        "object_key": asset.object_key,
        "original_url": original_url,
        "thumbnail_url": first_url(
            asset.thumbnail_url
        ),
        "media_type": asset.media_type,
        "content_type": asset.content_type,
        "size": asset.size,
        "status": asset.status,
        "thumbnail_status": (
            getattr(asset, "thumbnail_status", None)
        ),
    }

    data.update(extra)

    return data

def initialize_profile_media_upload(
    *,
    user,
    profile_type: str,
    content_type: str,
    size: int,
):
    if profile_type not in {"avatar", "cover"}:
        raise ValidationError(
            "Invalid profile media type."
        )

    media_type = detect_media_type(
        content_type,
        "image",
    )

    media_id = generate_media_id()

    extension = get_extension(content_type)

    object_key = (
        f"users/{user.id}/profile/"
        f"{profile_type}/"
        f"{media_id}.{extension}"
    )

    upload_url = create_presigned_upload_url(
        object_key=object_key,
        content_type=content_type,
    )

    original_url = get_public_url(object_key)

    asset = MediaAsset.objects.create(
        user=user,
        media_id=media_id,
        object_key=object_key,
        original_url=[original_url],
        media_type=media_type,
        content_type=content_type,
        size=size,
        status="uploaded",
    )

    return {
        "media_id": asset.media_id,
        "upload_url": upload_url,
        "object_key": asset.object_key,
        "original_url": asset.original_url,
        "media_type": asset.media_type,
        "content_type": asset.content_type,
        "status": asset.status,
    }