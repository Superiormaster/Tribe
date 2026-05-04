from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import transaction
from users.utils import can_chat
from .models import Chat, Message, MessageReaction, Call
from .serializers import ChatSerializer, MessageSerializer
from .utils import generate_chat_key
from livekit.api import AccessToken, VideoGrants
from django.conf import settings
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import OuterRef, Subquery
from django.utils import timezone

User = get_user_model()

class ChatMessagePagination(PageNumberPagination):
    page_size = 20

class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Chat.objects.filter(members=self.request.user)

    def perform_create(self, serializer):
        chat = serializer.save()
        chat.members.add(self.request.user)

    @action(detail=False, methods=["get"], url_path="recent")
    def recent(self, request):
        user = request.user
    
        chats = Chat.objects.filter(members=user)\
            .select_related("last_message")\
            .prefetch_related("members")\
            .order_by("-updated_at")
    
        data = []
    
        for chat in chats:
            other_user = chat.members.exclude(id=user.id).first()
            last_msg = chat.last_message
    
            if not other_user:
                continue
    
            data.append({
                "chat_id": chat.id,
                "chat_key": chat.chat_key,
                "username": other_user.username,
                "avatar": getattr(other_user, "avatar", None),
                "text": last_msg.text if last_msg else "",
                "created_at": last_msg.created_at if last_msg else None,
                "fromUserId": last_msg.sender_id if last_msg else None,
                "toUserId": other_user.id,
            })
    
        return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_detail(request, chat_id):
    chat = Chat.objects.get(id=chat_id, members=request.user)

    messages = chat.messages.select_related("sender").order_by("created_at")

    paginator = ChatMessagePagination()
    page = paginator.paginate_queryset(messages, request)

    return Response({
        "chat_id": chat.id,
        "members": list(chat.members.values("id", "username", "avatar")),
        "results": MessageSerializer(page, many=True).data,
        "next": paginator.get_next_link(),
        "previous": paginator.get_previous_link(),
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_view(request, user_id):
    other_user = User.objects.get(id=user_id)

    if not can_chat(request.user, other_user):
        return Response(
            {"error": "You are not connected"},
            status=403
        )

    # continue chat logic
    return Response({"status": "ok"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_seen(request):
    chat_id = request.data["chatId"]

    chat = Chat.objects.get(id=chat_id, members=request.user)

    messages = chat.messages.exclude(seen_by=request.user)

    message_ids = []

    for msg in messages:
        msg.seen_by.add(request.user)
        message_ids.append(msg.id)

    return Response({
        "messageIds": message_ids
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def react_message(request, message_id):
    emoji = request.data["emoji"]

    message = Message.objects.get(id=message_id)

    reaction, created = MessageReaction.objects.get_or_create(
        message=message,
        user=request.user,
        defaults={"emoji": emoji}
    )

    if not created:
        reaction.emoji = emoji
        reaction.save()

    return Response({
      "message_id": message.id,
      "user_id": request.user.id,
      "emoji": reaction.emoji
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_or_create_chat(request):
    other_user_id = request.data.get("user_id")

    user1 = request.user
    user2 = User.objects.get(id=other_user_id)

    chat_key = generate_chat_key(user1.id, user2.id)

    chat, created = Chat.objects.get_or_create(
        chat_key=chat_key
    )

    chat.members.add(user1, user2)

    serializer = ChatSerializer(chat, context={"request": request})

    return Response({
        "chat_id": chat.id,
        "chat_key": chat.chat_key,
        "other_user": {
            "id": user2.id,
            "username": user2.username,
            "avatar": getattr(user2, "avatar", None),
        }
    })

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return Message.objects.filter(
            chat__members=user,
            is_deleted=False
        ).select_related("sender", "chat").order_by("created_at")

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user

        chat = serializer.validated_data["chat"]
        text = serializer.validated_data.get("text", "")
        media_url = serializer.validated_data.get("media_url")
        media_type = serializer.validated_data.get("media_type", "text")

        # 1. CREATE MESSAGE
        message = serializer.save(
            sender=user,
            text=text,
            media_url=media_url,
            media_type=media_type,
        )

        # 2. UPDATE CHAT (CRITICAL FIX)
        chat.last_message = message
        chat.updated_at = message.created_at
        chat.save(update_fields=["last_message", "updated_at"])

        # 3. OPTIONAL: reset unread state hooks (future use)
        ChatReadState.objects.filter(chat=chat).exclude(user=user).update(
            last_seen_message=message
        )

    @action(detail=True, methods=["post"])
    def toggle_pin(self, request, pk=None):
        message = self.get_object()
        user = request.user
    
        if not message.chat.members.filter(id=user.id).exists():
            return Response({"error": "Not allowed"}, status=403)
    
        message.is_pinned = not message.is_pinned
        message.save(update_fields=["is_pinned"])
    
        return Response({"is_pinned": message.is_pinned})

@api_view(["GET"])
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
def accept_call(request, call_id):
    call = Call.objects.get(id=call_id)

    call.status = "ongoing"
    call.save()

    return Response({"status": "ongoing"})

@api_view(["POST"])
def end_call(request, call_id):
    from django.utils import timezone

    call = Call.objects.get(id=call_id)
    call.status = "ended"
    call.ended_at = timezone.now()

    call.duration = (call.ended_at - call.started_at).seconds
    call.save()

    return Response({"status": "ended"})