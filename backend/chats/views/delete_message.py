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
def hide_messages(request):
    message_ids = request.data.get("message_ids", [])
    user = request.user

    messages = Message.objects.filter(
        id__in=message_ids,
        chat__participants__user=user,
    )

    hidden_ids = []

    for message in messages:
        message.hidden_for.add(user)
        hidden_ids.append(message.id)

    return Response({
        "hidden": hidden_ids,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_messages(request):
    message_ids = request.data.get("message_ids", [])
    user = request.user

    messages = (
        Message.objects.filter(
            id__in=message_ids,
            chat__participants__user=user,
        )
        .select_related("chat", "sender")
    )

    deleted_ids = []

    for message in messages:
        try:
            soft_delete_message(message, user)
            deleted_ids.append(message.id)
        except PermissionDenied:
            continue

    return Response({
        "deleted": deleted_ids,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hide_all_messages(request, chat_id):
    user = request.user

    messages = (
        Message.objects.filter(
            chat_id=chat_id,
            chat__participants__user=user,
        )
        .exclude(hidden_for=user)
    )

    hidden_ids = []

    for message in messages.iterator():
        message.hidden_for.add(user)
        hidden_ids.append(message.id)

    return Response(
        {
            "success": True,
            "hidden_count": len(hidden_ids),
            "hidden": hidden_ids,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hide_community_messages(request):
    message_ids = request.data.get("message_ids", [])
    user = request.user

    messages = Message.objects.filter(
        id__in=message_ids,
        chat__participants__user=user,
        chat__chat_type="community",
    )

    hidden_ids = []

    for message in messages:
        message.hidden_for.add(user)
        hidden_ids.append(message.id)

    return Response({
        "hidden": hidden_ids,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_community_messages(request):
    message_ids = request.data.get("message_ids", [])
    user = request.user

    messages = (
        Message.objects.filter(
            id__in=message_ids,
            chat__participants__user=user,
            chat__chat_type="community",
        )
        .select_related("chat", "sender")
    )

    deleted_ids = []

    for message in messages:
        try:
            soft_delete_message(message, user)
            deleted_ids.append(message.id)
        except PermissionDenied:
            continue

    return Response({
        "deleted": deleted_ids,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hide_all_community_messages(request, community_id):
    user = request.user

    messages = (
        Message.objects.filter(
            community_id=community_id,
            chat__participants__user=user,
            chat__chat_type="community",
        )
        .exclude(hidden_for=user)
    )

    hidden_ids = []

    for message in messages.iterator():
        message.hidden_for.add(user)
        hidden_ids.append(message.id)

    return Response(
        {
            "success": True,
            "hidden_count": len(hidden_ids),
            "hidden": hidden_ids,
        },
        status=status.HTTP_200_OK,
    )