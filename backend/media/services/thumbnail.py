# media/services/thumbnail.py

import io
import os
import subprocess
import tempfile

import boto3
from botocore.config import Config
from PIL import Image

from .r2 import (
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
    r2_client,
)

IMAGE_THUMBNAIL_SIZE = 720

VIDEO_THUMBNAIL_WIDTH = 720
VIDEO_THUMBNAIL_HEIGHT = 1280

VIDEO_THUMBNAIL_QUALITY = 4

def get_thumbnail_url(object_key: str) -> str:
    return f"{R2_PUBLIC_URL}/{object_key}"

def generate_image_thumbnail(asset):
    """
    Download original image from R2,
    resize/compress it,
    upload WebP thumbnail back to R2.
    """

    response = r2_client.get_object(
        Bucket=R2_BUCKET_NAME,
        Key=asset.object_key,
    )

    image_data = response["Body"].read()

    image = Image.open(
        io.BytesIO(image_data)
    )

    if getattr(image, "is_animated", False):
        image.seek(0)

    image = image.convert("RGB")

    image.thumbnail(
        (
            IMAGE_THUMBNAIL_SIZE,
            IMAGE_THUMBNAIL_SIZE,
        ),
        Image.Resampling.LANCZOS,
    )

    output = io.BytesIO()

    image.save(
        output,
        format="WEBP",
        quality=75,
        method=6,
    )

    output.seek(0)

    thumbnail_key = (
        f"users/{asset.user_id}/media/"
        f"thumbnails/{asset.media_id}.webp"
    )

    r2_client.upload_fileobj(
        output,
        R2_BUCKET_NAME,
        thumbnail_key,
        ExtraArgs={
            "ContentType": "image/webp",
            "CacheControl": "public, max-age=31536000, immutable",
        },
    )

    return get_thumbnail_url(
        thumbnail_key
    )


def generate_video_thumbnail(asset):
    """
    Use FFmpeg to extract a frame from the video.

    The video is read directly from its public R2 URL,
    so Django does not need to download the entire video.
    """

    video_url = (
        asset.original_url[0]
        if isinstance(asset.original_url, list)
        else asset.original_url
    )

    if not video_url:
        raise ValueError(
            "Media asset has no original URL."
        )

    with tempfile.NamedTemporaryFile(
        suffix=".jpg",
        delete=False,
    ) as temp_file:

        output_path = temp_file.name

    try:

        command = [
            "ffmpeg",

            "-y",

            # Seek to approximately 1 second
            "-ss",
            "1",

            # Input
            "-i",
            video_url,

            # Extract one frame
            "-frames:v",
            "1",

            # Scale while preserving aspect ratio
            "-vf",
            (
                "scale="
                f"{VIDEO_THUMBNAIL_WIDTH}:"
                f"{VIDEO_THUMBNAIL_HEIGHT}:"
                "force_original_aspect_ratio=decrease"
            ),

            # JPEG quality
            "-q:v",
            str(VIDEO_THUMBNAIL_QUALITY),

            output_path,
        ]

        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60,
        )

        if result.returncode != 0:

            raise RuntimeError(
                "FFmpeg failed:\n"
                + result.stderr.decode(
                    "utf-8",
                    errors="ignore",
                )
            )

        with open(
            output_path,
            "rb",
        ) as thumbnail_file:

            thumbnail_data = thumbnail_file.read()

        if not thumbnail_data:
            raise RuntimeError(
                "FFmpeg generated an empty thumbnail."
            )

        thumbnail_key = (
            f"users/{asset.user_id}/media/"
            f"thumbnails/{asset.media_id}.jpg"
        )

        r2_client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=thumbnail_key,
            Body=thumbnail_data,
            ContentType="image/jpeg",
            CacheControl=(
                "public, max-age=31536000, immutable"
            ),
        )

        return get_thumbnail_url(
            thumbnail_key
        )

    finally:

        try:
            os.remove(output_path)
        except OSError:
            pass