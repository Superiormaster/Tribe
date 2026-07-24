from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework import status
from communities.models import CommunityMembership
from django.utils import timezone

from chats.models import (
    Chat,
    ChatParticipant,
)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_chat(request, chat_id):
    chat = get_object_or_404(
        Chat,
        id=chat_id,
        members=request.user,
    )

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=request.user,
    )

    participant.archived = not participant.archived

    participant.archived_at = (
        timezone.now()
        if participant.archived
        else None
    )

    participant.save(
        update_fields=[
            "archived",
            "archived_at",
        ]
    )

    return Response({
        "archived": participant.archived,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_community_chat(request, chat_id):
    chat = get_object_or_404(
        Chat,
        pk=chat_id,
        chat_type="community",
    )

    if not CommunityMembership.objects.filter(
        community=chat.community,
        user=request.user,
    ).exists():
        return Response(
            {
                "detail": "You are not a member of this community."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=request.user,
    )

    participant.archived = not participant.archived
    participant.archived_at = (
        timezone.now()
        if participant.archived
        else None
    )

    participant.save(
        update_fields=[
            "archived",
            "archived_at",
        ]
    )

    return Response({
        "archived": participant.archived,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def archive_community_chats(request):
    chat_ids = request.data.get("chat_ids", [])

    chats = Chat.objects.filter(
        id__in=chat_ids,
        chat_type="community",
    )

    archived = []

    for chat in chats:
        if not CommunityMembership.objects.filter(
            community=chat.community,
            user=request.user,
        ).exists():
            continue

        participant, _ = ChatParticipant.objects.get_or_create(
            chat=chat,
            user=request.user,
        )

        participant.archived = not participant.archived
        participant.archived_at = (
            timezone.now()
            if participant.archived
            else None
        )

        participant.save(
            update_fields=[
                "archived",
                "archived_at",
            ]
        )

        archived.append({
            "chat_id": chat.id,
            "archived": participant.archived,
        })

    return Response({
        "success": True,
        "results": archived,
    })