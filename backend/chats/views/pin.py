from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404
from django.utils import timezone

from chats.models import (
    Chat,
    ChatParticipant,
    Message,
)

from communities.models import CommunityMembership

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pin_chat(request, chat_id):
    chat = get_object_or_404(
        Chat,
        id=chat_id,
        participants__user=request.user,
    )

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=request.user,
    )

    if not participant.pinned:

        pinned_count = ChatParticipant.objects.filter(
            user=request.user,
            pinned=True,
            chat__chat_type="private",
        ).count()

        if pinned_count >= 3:
            return Response(
                {
                    "error": "You can only pin up to 3 chats."
                },
                status=400,
            )

        participant.pinned = True
        participant.pinned_at = timezone.now()

    else:

        participant.pinned = False
        participant.pinned_at = None

    participant.save(
        update_fields=[
            "pinned",
            "pinned_at",
        ]
    )

    return Response({
        "chat_id": chat.id,
        "pinned": participant.pinned,
        "pinned_at": participant.pinned_at,
        "pinned_count": ChatParticipant.objects.filter(
            user=request.user,
            pinned=True,
            chat__chat_type="private",
        ).count(),
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pin_community_chat(request, chat_id):
    user = request.user

    chat = get_object_or_404(
        Chat,
        id=chat_id,
        chat_type="community",
    )

    if not CommunityMembership.objects.filter(
        community=chat.community,
        user=user,
    ).exists():
        return Response(
            {"error": "You are not a member of this community."},
            status=403,
        )

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=user,
    )

    if not participant.pinned:

        pinned_count = ChatParticipant.objects.filter(
            user=user,
            pinned=True,
            chat__chat_type="community",
        ).count()

        if pinned_count >= 2:
            return Response(
                {
                    "error": "You can only pin up to 2 community chats."
                },
                status=400,
            )

        participant.pinned = True
        participant.pinned_at = timezone.now()

    else:

        participant.pinned = False
        participant.pinned_at = None

    participant.save(
        update_fields=[
            "pinned",
            "pinned_at",
        ]
    )

    return Response({
        "chat_id": chat.id,
        "community_id": chat.community.id,
        "pinned": participant.pinned,
        "pinned_at": participant.pinned_at,
        "pinned_count": ChatParticipant.objects.filter(
            user=user,
            pinned=True,
            chat__chat_type="community",
        ).count(),
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pin_community_message(request, message_id):
    message = get_object_or_404(
        Message,
        id=message_id,
        community__isnull=False,
    )

    community = message.community

    if not can_moderate(
        request.user,
        community,
    ):
        return Response(
            {"error": "Only moderators can pin messages."},
            status=403,
        )

    message.is_pinned = True
    message.pinned_by = request.user
    message.pinned_at = timezone.now()

    message.save(
        update_fields=[
            "is_pinned",
            "pinned_by",
            "pinned_at",
        ]
    )

    return Response({
        "success": True,
        "is_pinned": True,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unpin_community_message(request, message_id):
    message = get_object_or_404(
        Message,
        id=message_id,
        community__isnull=False,
    )

    community = message.community

    if not can_moderate(
        request.user,
        community,
    ):
        return Response(
            {"error": "Only moderators can unpin messages."},
            status=403,
        )

    message.is_pinned = False
    message.pinned_by = None
    message.pinned_at = None

    message.save(
        update_fields=[
            "is_pinned",
            "pinned_by",
            "pinned_at",
        ]
    )

    return Response({
        "success": True,
        "is_pinned": False,
    })