from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from chats.models import (
    Chat,
    ChatReadState,
    ChatParticipant,
)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_seen(request):
    chat_id = request.data.get("chatId")
    user = request.user

    try:
        chat = Chat.objects.get(
            id=chat_id,
            participants__user=user,
        )
    except Chat.DoesNotExist:
        return Response(
            {"detail": "Chat not found"},
            status=404,
        )

    latest = (
        chat.messages
        .exclude(sender=user)
        .filter(is_deleted=False)
        .order_by("-id")
        .first()
    )

    if not latest:
        return Response({
            "messageIds": [],
            "lastSeenMessageId": None,
        })

    state, _ = ChatReadState.objects.get_or_create(
        user=user,
        chat=chat,
    )

    previous_id = (
        state.last_seen_message_id or 0
    )

    if latest.id > previous_id:
        state.last_seen_message = latest
        state.save(
            update_fields=[
                "last_seen_message"
            ]
        )

    message_ids = list(
        chat.messages
        .exclude(sender=user)
        .filter(
            is_deleted=False,
            id__gt=previous_id,
            id__lte=latest.id,
        )
        .values_list(
            "id",
            flat=True
        )
    )

    return Response({
        "messageIds": message_ids,
        "lastSeenMessageId": latest.id,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_delivered(request):
    chat_id = request.data.get("chatId")
    user = request.user

    try:
        chat = Chat.objects.get(
            id=chat_id,
            participants__user=user,
        )
    except Chat.DoesNotExist:
        return Response(
            {"detail": "Chat not found"},
            status=404,
        )

    latest = (
        chat.messages
        .exclude(sender=user)
        .filter(is_deleted=False)
        .order_by("-id")
        .first()
    )

    if not latest:
        return Response({
            "messageIds": [],
            "lastDeliveredMessageId": None,
        })

    participant, _ = (
        ChatParticipant.objects
        .get_or_create(
            chat=chat,
            user=user,
        )
    )

    previous_id = (
        participant.last_delivered_message_id
        or 0
    )

    if latest.id > previous_id:
        participant.last_delivered_message = latest
        participant.save(
            update_fields=[
                "last_delivered_message"
            ]
        )

    message_ids = list(
        chat.messages
        .exclude(sender=user)
        .filter(
            is_deleted=False,
            id__gt=previous_id,
            id__lte=latest.id,
        )
        .values_list(
            "id",
            flat=True
        )
    )

    return Response({
        "messageIds": message_ids,
        "lastDeliveredMessageId": latest.id,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_delivered(request):
    user = request.user

    deliveries = []

    chats = (
        Chat.objects
        .filter(participants__user=user)
        .prefetch_related("messages")
    )

    for chat in chats:
        latest = (
            chat.messages
            .exclude(sender=user)
            .filter(is_deleted=False)
            .order_by("-id")
            .first()
        )

        if not latest:
            continue

        participant, _ = (
            ChatParticipant.objects
            .get_or_create(
                chat=chat,
                user=user,
            )
        )

        previous_id = (
            participant.last_delivered_message_id
            or 0
        )

        if latest.id <= previous_id:
            continue

        participant.last_delivered_message = latest
        participant.save(
            update_fields=[
                "last_delivered_message"
            ]
        )

        message_ids = list(
            chat.messages
            .exclude(sender=user)
            .filter(
                is_deleted=False,
                id__gt=previous_id,
                id__lte=latest.id,
            )
            .values_list(
                "id",
                flat=True
            )
        )

        deliveries.append({
            "chatId": chat.id,
            "messageIds": message_ids,
            "lastDeliveredMessageId": latest.id,
        })

    return Response(deliveries)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_community_delivered(request):
    community_id = request.data.get("communityId")
    user = request.user

    try:
        chat = Chat.objects.get(
            community_id=community_id,
            chat_type="community",
        )
    except Chat.DoesNotExist:
        return Response(
            {"detail": "Community chat not found"},
            status=404,
        )

    latest = (
        chat.messages
        .exclude(sender=user)
        .filter(
            is_deleted=False,
            deleted_by_admin=False,
        )
        .order_by("-id")
        .first()
    )

    if not latest:
        return Response({
            "messageIds": [],
            "lastDeliveredMessageId": None,
        })

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=user,
    )

    previous_id = (
        participant.last_delivered_message_id
        or 0
    )

    if latest.id > previous_id:
        participant.last_delivered_message = latest
        participant.save(
            update_fields=[
                "last_delivered_message",
            ]
        )

    message_ids = list(
        chat.messages
        .exclude(sender=user)
        .filter(
            is_deleted=False,
            deleted_by_admin=False,
            id__gt=previous_id,
            id__lte=latest.id,
        )
        .values_list(
            "id",
            flat=True,
        )
    )

    return Response({
        "messageIds": message_ids,
        "lastDeliveredMessageId": latest.id,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_community_seen(request):
    print("REQUEST DATA:", request.data)
    print("REQUEST CONTENT TYPE:", request.content_type)

    community_id = request.data.get("communityId")
    user = request.user

    print(
        "MARK COMMUNITY SEEN:",
        "community_id=",
        community_id,
        "user=",
        user.id,
    )

    try:
        chat = Chat.objects.get(
            community_id=community_id,
            chat_type="community",
        )
    except Chat.DoesNotExist:
        return Response(
            {"detail": "Community chat not found"},
            status=404,
        )

    latest = (
        chat.messages
        .exclude(sender=user)
        .filter(
            is_deleted=False,
            deleted_by_admin=False,
        )
        .order_by("-id")
        .first()
    )

    if not latest:
        return Response({
            "messageIds": [],
            "lastSeenMessageId": None,
        })

    state, _ = ChatReadState.objects.get_or_create(
        user=user,
        chat=chat,
    )

    previous_id = (
        state.last_seen_message_id or 0
    )
    
    if latest.id > previous_id:
    
        state.last_seen_message = latest
    
        state.save(
            update_fields=[
                "last_seen_message",
            ]
        )

    message_ids = list(
        chat.messages
        .exclude(sender=user)
        .filter(
            is_deleted=False,
            deleted_by_admin=False,
            id__gt=previous_id,
            id__lte=latest.id,
        )
        .values_list(
            "id",
            flat=True,
        )
    )

    return Response({
        "messageIds": message_ids,
        "lastSeenMessageId": latest.id,
    })