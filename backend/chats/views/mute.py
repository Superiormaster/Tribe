from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from chats.models import (
    Chat,
    ChatParticipant,
)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mute_chat(request, chat_id):
    chat = get_object_or_404(Chat, id=chat_id)

    if request.user not in chat.members.all():
        return Response(
            {"detail": "Not a participant."},
            status=403,
        )

    duration = request.data.get("duration", "8h")

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=request.user,
    )

    participant.is_muted = True

    if duration == "forever":
        participant.muted_until = None

    elif duration == "8h":
        participant.muted_until = (
            timezone.now() + timedelta(hours=8)
        )

    elif duration == "1w":
        participant.muted_until = (
            timezone.now() + timedelta(days=7)
        )

    else:
        return Response(
            {"detail": "Invalid duration."},
            status=400,
        )

    participant.save()

    return Response({
        "success": True,
        "muted_until": participant.muted_until,
        "duration": duration,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unmute_chat(request, chat_id):
    chat = get_object_or_404(Chat, id=chat_id)

    participant = ChatParticipant.objects.filter(
        chat=chat,
        user=request.user,
    ).first()

    if participant:
        participant.is_muted = False
        participant.muted_until = None
        participant.save()

    return Response({
        "success": True,
    })