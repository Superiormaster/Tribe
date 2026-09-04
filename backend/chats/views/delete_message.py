from django.db import transaction
from django.core.exceptions import PermissionDenied

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from chats.models import Message
from chats.utils.delete import soft_delete_message

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_messages(request):
    message_ids = request.data.get("message_ids", [])

    if not isinstance(message_ids, list):
        return Response(
            {
                "detail": "message_ids must be a list."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    messages = (
        Message.objects
        .filter(
            id__in=message_ids,
        )
        .select_related(
            "chat",
            "sender",
        )
        .prefetch_related(
            "media_assets",
        )
    )

    deleted_messages = []
    failed_messages = []

    for message in messages:

        is_participant = message.chat.participants.filter(
            user=user
        ).exists()

        if not is_participant:
            failed_messages.append({
                "id": message.id,
                "reason": "not_a_participant",
            })
            continue

        if message.sender_id != user.id:
            failed_messages.append({
                "id": message.id,
                "reason": "not_message_owner",
            })
            continue

        if message.is_deleted:
            continue

        try:

            soft_delete_message(
                message,
                user,
            )

            deleted_messages.append({
                "id": message.id,
                "deleted_by_admin":
                    message.deleted_by_admin,
                "deleted_text":
                    message.text,
            })

        except PermissionDenied:

            failed_messages.append({
                "id": message.id,
                "reason": "permission_denied",
            })

    return Response({
        "deleted": deleted_messages,
        "failed": failed_messages,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hide_messages(request):
    message_ids = request.data.get("message_ids", [])

    if not isinstance(message_ids, list):
        return Response(
            {
                "detail": "message_ids must be a list."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    messages = (
        Message.objects
        .filter(id__in=message_ids)
        .filter(
            chat__participants__user=user
        )
    )

    hidden_ids = []

    for message in messages:

        if not message.hidden_for.filter(
            id=user.id
        ).exists():

            message.hidden_for.add(user)

        hidden_ids.append(
            message.id
        )

    return Response({
        "hidden": hidden_ids,
    })