from chats.serializers import (
    PrivateMessageSerializer,
    CommunityMessageSerializer,
)


def get_message_preview(*, data):
    media_type = data.get("media_type") or "text"

    if media_type == "image":
        return "📷 Photo"

    if media_type == "video":
        return "🎥 Video"

    if media_type == "audio":
        return "🎤 Voice message"

    if media_type == "gif":
        return "🎞 GIF"

    if media_type == "sticker":
        return "😊 Sticker"

    if media_type == "gallery":
        return "🖼 Multiple photos"

    return (
        data.get("encrypted_text")
        or data.get("caption")
        or "New message"
    )


def get_thumbnail(data):
    media_assets = data.get("media_assets") or []

    if media_assets:
        asset = media_assets[0]

        return (
            asset.get("thumbnail_url")
            or asset.get("original_url")
            or ""
        )

    external_urls = data.get("external_media_urls") or []

    if external_urls:
        return external_urls[0] or ""

    return ""


def build_private_chat_payload(
    *,
    message,
    recipient,
):
    data = PrivateMessageSerializer(
        message,
        context={},
    ).data

    sender = message.sender

    from users.utils import get_user_avatar

    chat_id = str(message.chat_id)

    return {
        "id": str(message.id),

        "type": "chat",

        "chatType": "private",

        "chatId": chat_id,

        "messageId": str(message.id),

        # ==================================
        # GROUPING
        # ==================================

        "groupKey": f"private:{chat_id}",
        "groupType": "private",
        "groupId": chat_id,
        "groupTitle": sender.username,

        # ==================================
        # SENDER
        # ==================================

        "senderId": str(message.sender_id),

        "senderName": sender.username,

        "senderAvatar": (
            get_user_avatar(sender) or ""
        ),

        # ==================================
        # MESSAGE
        # ==================================

        "body": get_message_preview(
            data=data
        ),

        "mediaType": (
            data.get("media_type")
            or "text"
        ),

        "thumbnail": get_thumbnail(data),

        "recipientId": str(recipient.id),
        "createdAt": message.created_at.isoformat(),
    }


def build_community_chat_payload(
    *,
    message,
    recipient,
):
    data = CommunityMessageSerializer(
        message,
        context={},
    ).data

    community = message.community
    sender = message.sender

    from users.utils import get_user_avatar

    community_id = (
        str(message.community_id)
        if message.community_id
        else ""
    )

    community_cover = ""

    if community:

        if community.cover_image_asset:

            community_cover = (
                community
                .cover_image_asset
                .original_url
                or ""
            )

        else:

            community_cover = (
                community.cover_image
                or ""
            )

    return {
        "id": str(message.id),

        "type": "community_chat",

        "chatType": "community",

        "chatId": str(message.chat_id),

        "messageId": str(message.id),

        # ==================================
        # GROUPING
        # ==================================

        "groupKey": (
            f"community:{community_id}"
            if community_id
            else f"chat:{message.chat_id}"
        ),

        "groupType": "community",

        "groupId": community_id,

        "groupTitle": (
            community.name
            if community
            else "Community"
        ),

        # ==================================
        # SENDER
        # ==================================

        "senderId": str(message.sender_id),

        "senderName": sender.username,

        "senderAvatar": (
            get_user_avatar(sender)
            or ""
        ),

        # ==================================
        # COMMUNITY
        # ==================================

        "communityId": community_id,

        "communityName": (
            community.name
            if community
            else ""
        ),

        "communityCover": community_cover,

        # ==================================
        # MESSAGE
        # ==================================

        "body": get_message_preview(
            data=data
        ),

        "mediaType": (
            data.get("media_type")
            or "text"
        ),

        "thumbnail": get_thumbnail(data),

        "recipientId": str(recipient.id),
        "createdAt": message.created_at.isoformat(),
    }