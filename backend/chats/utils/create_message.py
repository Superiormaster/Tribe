from chats.models import Message

def build_message_kwargs(
    request,
    serializer,
    chat,
    community=None,
):
    encrypted_text = request.data.get("encrypted_text")
    caption = request.data.get("caption")

    media_url = (
        serializer.validated_data.get("media_url") or []
    )

    thumbnail = serializer.validated_data.get(
        "thumbnail"
    )

    duration = serializer.validated_data.get(
        "duration",
        []
    )

    waveform = serializer.validated_data.get(
        "waveform",
        []
    )

    media_type = serializer.validated_data.get(
        "media_type",
        "text"
    )

    media_source = serializer.validated_data.get(
        "media_source"
    )

    client_id = request.data.get("client_id")

    forwarded_from = serializer.validated_data.get(
        "forwarded_from"
    )

    mentions = serializer.validated_data.get(
        "mentions",
        []
    )

    reply_to_id = request.data.get("reply_to")

    # Handle accidental object payload
    if isinstance(reply_to_id, dict):
        reply_to_id = reply_to_id.get("id")

    try:
        reply_to_id = (
            int(reply_to_id)
            if reply_to_id
            else None
        )
    except (TypeError, ValueError):
        reply_to_id = None

    reply_to = None

    if reply_to_id:
        reply_to = Message.objects.filter(
            id=reply_to_id,
            chat=chat
        ).first()

    save_kwargs = {
        "sender": request.user,
        "chat": chat,
        "community": community,
        "encrypted_text": encrypted_text,
        "caption": caption,
        "media_type": media_type,
        "media_source": media_source,
        "thumbnail": thumbnail,
        "duration": duration,
        "waveform": waveform,
        "reply_to": reply_to,
        "forwarded_from": forwarded_from,
        "client_id": client_id,
    }

    if media_url is not None:
        save_kwargs["media_url"] = media_url

    return save_kwargs, mentions