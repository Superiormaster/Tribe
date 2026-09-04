from chats.models import (
    Message,
    MessageMention,
)
from django.core.exceptions import ValidationError
from media.models import MediaAsset


def build_message_kwargs(
    request,
    serializer,
    chat,
    community=None,
):
    encrypted_text = request.data.get("encrypted_text")
    caption = request.data.get("caption")

    media_type = serializer.validated_data.get(
        "media_type",
        "text",
    )
 
    client_created_at = request.data.get(
        "client_created_at"
    )

    media_source = serializer.validated_data.get(
        "media_source"
    )

    client_id = request.data.get("client_id")

    forwarded_from = serializer.validated_data.get(
        "forwarded_from"
    )

    mention_user_ids = serializer.validated_data.get(
        "mention_user_ids",
        []
    )

    mention_all = serializer.validated_data.get(
        "mention_all",
        False
    )

    waveform = serializer.validated_data.get(
        "waveform",
        []
    )

    reply_to = serializer.validated_data.get("reply_to")

    if reply_to and reply_to.chat_id != chat.id:
        raise ValidationError({
            "reply_to_id":
                "Reply message must belong to the same chat."
        })

    media_asset_ids = serializer.validated_data.get(
        "media_asset_ids",
        []
    )

    media_url = serializer.validated_data.get(
        "media_url",
        []
    )

    media_asset_ids = [
        str(x).strip()
        for x in media_asset_ids
        if str(x).strip()
    ]

    media_url = [
        url.strip()
        for url in media_url
        if isinstance(url, str)
        and url.strip()
    ]

    media_assets = MediaAsset.objects.none()

    if media_source == "upload":

        media_assets = MediaAsset.objects.filter(
            media_id__in=media_asset_ids,
            user=request.user,
            status="ready",
        )

        requested_ids = set(
            media_asset_ids
        )

        found_ids = set(
            media_assets.values_list(
                "media_id",
                flat=True,
            )
        )

        missing_ids = (
            requested_ids - found_ids
        )

        if missing_ids:
            raise ValidationError(
                "One or more media assets are unavailable."
            )

    save_kwargs = {
        "sender": request.user,
        "chat": chat,
        "community": community,
        "encrypted_text": encrypted_text,
        "caption": caption,
        "media_type": media_type,
        "media_source": media_source,
        "waveform": waveform,
        "reply_to": reply_to,
        "external_media_urls":
            media_url
            if media_source == "external"
            else [],
        "forwarded_from": forwarded_from,
        "client_id": client_id,
        "client_created_at": client_created_at,

        # NEW
        "mention_all": mention_all,
    }

    return (
        save_kwargs,
        mention_user_ids,
        media_assets,
    )