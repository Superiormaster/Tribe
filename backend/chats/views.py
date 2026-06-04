from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.contrib.auth import get_user_model
from django.db import transaction
from users.utils import can_chat
from .models import (
    CommunityMute,
    CommunityBan,
    Call,
    MessageReaction,
    Message,
    Chat,
    MessageReport,
    VoiceRoom,
    CommunityEvent,
    AnnouncementChannel,
    AnnouncementPost,
    MessageThread,
    ChatReadState,
)
from .serializers import (
    CommunityMuteSerializer,
    CommunityBanSerializer,
    MessageReportSerializer,
    MessageSerializer,
    ChatSerializer,
    VoiceRoomSerializer,
    CommunityEventSerializer,
    AnnouncementChannelSerializer,
    AnnouncementPostSerializer,
    MessageThreadSerializer,
)
from .utils import generate_chat_key
from livekit.api import AccessToken, VideoGrants
from django.conf import settings
from rest_framework.response import Response
from django.core.exceptions import PermissionDenied
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
            members = list(chat.members.all())
            other_user = next((m for m in members if m.id != user.id), None)
    
            if not other_user:
                continue
    
            state = ChatReadState.objects.filter(
                user=user,
                chat=chat
            ).first()
    
            last_seen_id = state.last_seen_message_id if state else 0

            last_sender_id = chat.last_message.sender_id
    
            unseen_count = chat.messages.filter(
                id__gt=last_seen_id,
                is_deleted=False
            ).exclude(
                sender=user
            ).exclude(
                hidden_for=user
            ).count()
    
            last_msg = chat.last_message
    
            data.append({
                "chat_id": chat.id,
                "chat_key": chat.chat_key,
                "username": other_user.username,
                "avatar": getattr(other_user, "avatar", None),
                "text": (
                    (last_msg.text[:60] if getattr(last_msg, "text", None) else "")
                    or (last_msg.encrypted_text[:60] if last_msg and last_msg.encrypted_text else "")
                ),
                "created_at": last_msg.created_at if last_msg else None,
                "fromUserId": last_msg.sender_id if last_msg else None,
                "last_sender_id": chat.last_message.sender_id,
                "unseen": unseen_count,
            })
    
        return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_detail(request, chat_id):
    chat = Chat.objects.get(id=chat_id, members=request.user)

    messages = chat.messages.select_related(
        "sender",
        "reply_to",
        "reply_to__sender"
    ).prefetch_related(
        "reactions",
        "reactions__user"
    ).order_by("created_at")

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
    chat_id = request.data.get("chatId")
    user = request.user

    chat = Chat.objects.get(id=chat_id, members=user)

    last_msg = chat.messages.order_by("-id").first()

    if not last_msg:
        return Response({"messageIds": []})

    state, _ = ChatReadState.objects.get_or_create(
        user=user,
        chat=chat
    )

    state.last_seen_message = last_msg
    state.save()

    return Response({
        "lastSeenMessageId": last_msg.id
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def react_message(request, message_id):
    emoji = request.data["emoji"]

    message = Message.objects.get(id=message_id)

    reaction = MessageReaction.objects.filter(
        message=message,
        user=request.user
    ).first()

    if reaction:

        if reaction.emoji == emoji:

            reaction.delete()

            return Response({
                "removed": True,
                "message_id": message.id,
                "user_id": request.user.id,
                "emoji": emoji,
            })

        reaction.emoji = emoji
        reaction.save()

    else:

        reaction = MessageReaction.objects.create(
            message=message,
            user=request.user,
            emoji=emoji
        )

    return Response({
        "message_id": message.id,
        "user_id": request.user.id,
        "emoji": reaction.emoji,
        "removed": False,
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

def soft_delete_message(message, user):
    chat = message.chat

    is_admin = chat.is_chat_admin(user)
    is_owner = message.sender_id == user.id

    if not is_owner and not is_admin:
        raise PermissionDenied("No permission to delete this message")

    message.is_deleted = True

    if chat.chat_type == "community" and is_admin and not is_owner:
        message.deleted_by_admin = True
        message.text = "Deleted by administrator"
    else:
        message.text = "Deleted message"

    message.encrypted_text = ""
    message.media_url = None
    message.thumbnail = None
    message.reply_to = None
    message.deleted_at = timezone.now()
    message.save()

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return Message.objects.filter(
            chat_id=self.kwargs["chat_id"],
            chat__members=user,
        ).exclude(
            hidden_for=user
        ).select_related(
            "sender",
            "chat",
            "reply_to",
            "reply_to__sender"
        ).prefetch_related(
            "reactions",
            "reactions__user"
        ).order_by("created_at")

    @transaction.atomic
    def perform_create(self, serializer):
      chat = Chat.objects.get(id=self.kwargs["chat_id"])
      user = self.request.user
  
      encrypted_text = self.request.data.get("encrypted_text") 

      media_url = serializer.validated_data.get("media_url")
      media_type = serializer.validated_data.get("media_type", "text")
  
      print("SAVING encrypted_text =", encrypted_text)

      reply_to_id = self.request.data.get("reply_to")

      # Handle accidental object payloads
      if isinstance(reply_to_id, dict):
          reply_to_id = reply_to_id.get("id")
      
      # Convert safely
      try:
          reply_to_id = int(reply_to_id) if reply_to_id else None
      except (TypeError, ValueError):
          reply_to_id = None
      
      reply_to = None
      
      if reply_to_id:
          reply_to = Message.objects.filter(
              id=reply_to_id,
              chat=chat
          ).first()
  
      message = serializer.save(
          sender=user,
          chat=chat,
          encrypted_text=encrypted_text,
          media_url=media_url,
          media_type=media_type,
          reply_to=reply_to
      )
  
      print("SAVED encrypted_text =", message.encrypted_text)
  
      chat.last_message = message
      chat.updated_at = message.created_at
      chat.save(update_fields=["last_message", "updated_at"])
  
      ChatReadState.objects.update_or_create(
          user=user,
          chat=chat,
          defaults={"last_seen_message": message}
      )

    def create(self, request, *args, **kwargs):
      serializer = self.get_serializer(data=request.data)
      serializer.is_valid(raise_exception=True)
  
      self.perform_create(serializer)
  
      headers = self.get_success_headers(serializer.data)
  
      return Response(
          serializer.data,
          status=status.HTTP_201_CREATED,
          headers=headers
      )

    @action(detail=False, methods=["POST"], url_path="hide")
    def hide_messages(self, request, chat_id=None):
        message_ids = request.data.get("message_ids", [])
        user = request.user
    
        messages = Message.objects.filter(
            id__in=message_ids,
            chat__members=user
        )
    
        for msg in messages:
            msg.hidden_for.add(user)
    
        return Response({"hidden": message_ids})

    @action(detail=False, methods=["POST"], url_path="delete")
    @transaction.atomic
    def delete_messages(self, request, *args, **kwargs):

        message_ids = request.data.get("message_ids", [])
        user = request.user

        messages = Message.objects.filter(
            id__in=message_ids,
            chat__members=user
        ).select_related("chat", "sender")

        deleted_ids = []

        for msg in messages:
            try:
                soft_delete_message(msg, user)
                deleted_ids.append(msg.id)
            except PermissionDenied:
                continue

        return Response({
            "deleted": deleted_ids
        })

    @action(detail=True, methods=["POST"])
    def toggle_pin(self, request, pk=None):
    
        message = self.get_object()
    
        chat = message.chat
    
        if chat.chat_type == "community":
    
            if not chat.is_chat_admin(request.user):
                return Response(
                    {"error": "Only admins can pin"},
                    status=403
                )
    
        message.is_pinned = not message.is_pinned
    
        if message.is_pinned:
            message.pinned_by = request.user
            message.pinned_at = timezone.now()
        else:
            message.pinned_by = None
            message.pinned_at = None
    
        message.save()
    
        return Response({
            "is_pinned": message.is_pinned
        })

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

# COMMUNITY chat

class CommunityModerationViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]

    queryset = CommunityMute.objects.all()

    serializer_class = CommunityMuteSerializer

    @action(detail=False, methods=["POST"])
    def mute_user(self, request):

        serializer = CommunityMuteSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(
            muted_by=request.user
        )

        return Response(serializer.data)

    @action(detail=False, methods=["POST"])
    def ban_user(self, request):

        serializer = CommunityBanSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(
            banned_by=request.user
        )

        return Response(serializer.data)

    @action(detail=False, methods=["POST"])
    def report_message(self, request):

        serializer = MessageReportSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(
            reporter=request.user
        )

        return Response(serializer.data)

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

class CommunityEventViewSet(viewsets.ModelViewSet):

    queryset = CommunityEvent.objects.all()

    serializer_class = CommunityEventSerializer

    permission_classes = [IsAuthenticated]

class AnnouncementChannelViewSet(viewsets.ModelViewSet):

    queryset = AnnouncementChannel.objects.all()

    serializer_class = AnnouncementChannelSerializer

    permission_classes = [IsAuthenticated]

class AnnouncementPostViewSet(viewsets.ModelViewSet):

    queryset = AnnouncementPost.objects.all()

    serializer_class = AnnouncementPostSerializer

    permission_classes = [IsAuthenticated]

class MessageThreadViewSet(viewsets.ModelViewSet):

    queryset = MessageThread.objects.all()

    serializer_class = MessageThreadSerializer

    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["POST"])
    def reply(self, request, pk=None):

        thread = self.get_object()

        serializer = ThreadReplySerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(
            sender=request.user,
            thread=thread
        )

        return Response(serializer.data)