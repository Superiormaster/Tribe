from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from communities.models import CommunityMembership
from chats.models import Chat, ChatParticipant, Message

def _delete_chat_for_user(chat, user):
    """
    Hide every message in this chat for the current user only.

    - Messages are NOT deleted.
    - Message.is_deleted is NOT changed.
    - Other participants are unaffected.
    - Only the current user's ChatParticipant is marked deleted.
    """

    participant = ChatParticipant.objects.filter(
        chat=chat,
        user=user,
    ).first()

    if not participant:
        return False

    now = timezone.now()

    messages = (
        Message.objects
        .filter(chat=chat)
        .exclude(hidden_for=user)
    )

    for message in messages.iterator():
        message.hidden_for.add(user)

    participant.deleted = True
    participant.deleted_at = now

    participant.save(
        update_fields=[
            "deleted",
            "deleted_at",
        ]
    )

    return True

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_chat(request, chat_id):
    chat = get_object_or_404(
        Chat,
        pk=chat_id,
    )

    participant = ChatParticipant.objects.filter(
        chat=chat,
        user=request.user,
    ).first()

    if not participant:
        return Response(
            {
                "detail": "You are not a participant in this chat."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    _delete_chat_for_user(
        chat,
        request.user,
    )

    return Response({
        "success": True,
        "chat_id": chat.id,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_chats(request):
    chat_ids = request.data.get(
        "chat_ids",
        [],
    )

    if not isinstance(chat_ids, list):
        return Response(
            {
                "detail": "chat_ids must be a list."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    deleted_ids = []

    for chat_id in chat_ids:
        chat = Chat.objects.filter(
            pk=chat_id,
        ).first()

        if not chat:
            continue

        participant = ChatParticipant.objects.filter(
            chat=chat,
            user=request.user,
        ).first()

        if not participant:
            continue

        _delete_chat_for_user(
            chat,
            request.user,
        )

        deleted_ids.append(chat.id)

    return Response({
        "success": True,
        "chat_ids": deleted_ids,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_community_chat(request, chat_id):
    chat = get_object_or_404(
        Chat,
        pk=chat_id,
        chat_type="community",
    )

    # User must actually belong to the community.
    is_member = CommunityMembership.objects.filter(
        community=chat.community,
        user=request.user,
    ).exists()

    if not is_member:
        return Response(
            {
                "detail":
                    "You are not a member of this community."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    participant = ChatParticipant.objects.filter(
        chat=chat,
        user=request.user,
    ).first()

    if not participant:
        return Response(
            {
                "detail":
                    "You are not a participant in this chat."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    _delete_chat_for_user(
        chat,
        request.user,
    )

    return Response({
        "success": True,
        "chat_id": chat.id,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_community_chats(request):
    chat_ids = request.data.get(
        "chat_ids",
        [],
    )

    if not isinstance(chat_ids, list):
        return Response(
            {
                "detail": "chat_ids must be a list."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    deleted_ids = []

    chats = Chat.objects.filter(
        id__in=chat_ids,
        chat_type="community",
    ).select_related(
        "community",
    )

    for chat in chats:
        is_member = CommunityMembership.objects.filter(
            community=chat.community,
            user=request.user,
        ).exists()

        if not is_member:
            continue

        participant = ChatParticipant.objects.filter(
            chat=chat,
            user=request.user,
        ).first()

        if not participant:
            continue

        _delete_chat_for_user(
            chat,
            request.user,
        )

        deleted_ids.append(chat.id)

    return Response({
        "success": True,
        "chat_ids": deleted_ids,
    })