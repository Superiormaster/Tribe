from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings

from livekit.api import AccessToken, VideoGrants

from chats.models import (
    Call,
    VoiceRoom,
)

from chats.serializers import (
    VoiceRoomSerializer,
)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def livekit_token(request):
    room = request.GET.get("room")

    user = request.user

    token = AccessToken(
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
        identity=str(user.id),
    )

    token.with_grants(VideoGrant(room_join=True, room=room))

    return Response({
        "token": token.to_jwt(),
        "url": settings.LIVEKIT_URL
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_call(request):
    room_id = request.data["room_id"]
    call_type = request.data["type"]

    call = Call.objects.create(
        room_id=room_id,
        call_type=call_type,
        status="ringing"
    )

    call.participants.add(request.user)

    return Response({"id": call.id})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_call(request, call_id):
    call = get_object_or_404(
      Call,
      id=call_id,
    )

    call.status = "ongoing"
    call.save()

    return Response({"status": "ongoing"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def end_call(request, call_id):
    from django.utils import timezone

    call = get_object_or_404(
      Call,
      id=call_id,
    )
    call.status = "ended"
    call.ended_at = timezone.now()

    call.duration = (call.ended_at - call.started_at).seconds
    call.save()

    return Response({"status": "ended"})

# COMMUNITY chat
class VoiceRoomViewSet(viewsets.ModelViewSet):

    queryset = VoiceRoom.objects.all()

    serializer_class = VoiceRoomSerializer

    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["POST"])
    def join_room(self, request, pk=None):

        room = self.get_object()

        room.participants.add(request.user)

        return Response({
            "status": "joined"
        })

    @action(detail=True, methods=["POST"])
    def leave_room(self, request, pk=None):

        room = self.get_object()

        room.participants.remove(request.user)

        return Response({
            "status": "left"
        })