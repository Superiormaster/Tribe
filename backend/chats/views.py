from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.contrib.auth import get_user_model
from django.db import transaction
from users.utils import can_chat
from users.models import MutedUser, BlockedUser
from django.shortcuts import get_object_or_404
from feedback.models import Report
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
    ChatParticipant,
    MessageBlockedUser,
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
from datetime import timedelta
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
    
        page = int(
            request.query_params.get("page", 1)
        )
    
        page_size = 20
    
        participants = (
            ChatParticipant.objects
            .filter(
                user=user,
                deleted=False,
                archived=False
            )
            .select_related("chat")
            .prefetch_related(
                "chat__members",
                "chat__last_message",
            )
            .order_by(
                "-pinned",
                "-pinned_at",
                "-chat__updated_at"
            )
        )
    
        paginator = Paginator(
            participants,
            page_size
        )
    
        page_obj = paginator.get_page(page)
    
        data = []
    
        for participant in page_obj:
            chat = participant.chat
    
            members = list(
                chat.members.all()
            )
    
            other_user = next(
                (
                    m
                    for m in members
                    if m.id != user.id
                ),
                None
            )
    
            if not other_user:
                continue
    
            blocked = (
                BlockedUser.objects.filter(
                    user=user,
                    blocked_user=other_user
                ).exists()
            )
    
            blocked_me = (
                BlockedUser.objects.filter(
                    user=other_user,
                    blocked_user=user
                ).exists()
            )
    
            if blocked or blocked_me:
                continue
    
            visible_messages = (
                chat.messages
                .exclude(hidden_for=user)
                .filter(
                    is_deleted=False
                )
            )
    
            last_msg = (
                visible_messages
                .order_by("-created_at")
                .first()
            )
    
            # no visible messages,
            # don't show chat
            if not last_msg:
                continue
    
            state = (
                ChatReadState.objects.filter(
                    user=user,
                    chat=chat
                ).first()
            )
    
            last_seen_id = (
                state.last_seen_message_id
                if state and state.last_seen_message
                else 0
            )
    
            unseen_count = (
                visible_messages
                .filter(
                    id__gt=last_seen_id
                )
                .exclude(
                    sender=user
                )
                .count()
            )
    
            is_muted = False
    
            if participant.is_muted:
                if (
                    participant.muted_until is None
                ):
                    is_muted = True
                elif (
                    participant.muted_until >
                    timezone.now()
                ):
                    is_muted = True
                else:
                    participant.is_muted = False
                    participant.muted_until = None
                    participant.save(
                        update_fields=[
                            "is_muted",
                            "muted_until",
                        ]
                    )
    
            message_status = None

            if last_msg.sender_id == user.id:
                other_participant = (
                    ChatParticipant.objects
                    .filter(chat=chat)
                    .exclude(user=user)
                    .first()
                )
            
                other_read_state = (
                    ChatReadState.objects
                    .filter(
                        chat=chat,
                        user=other_user
                    )
                    .first()
                )
            
                if (
                    other_read_state and
                    other_read_state.last_seen_message_id and
                    other_read_state.last_seen_message_id >=
                    last_msg.id
                ):
                    message_status = "seen"
                
                elif (
                    other_participant and
                    other_participant.last_delivered_message_id and
                    other_participant.last_delivered_message_id >=
                    last_msg.id
                ):
                    message_status = "delivered"
                
                else:
                    message_status = "sent"
  
            data.append({
                "chat_id": chat.id,
                "chat_key": chat.chat_key,
                "username": other_user.username,
                "avatar": getattr(
                    other_user,
                    "avatar",
                    None
                ),
                "text": (
                    (
                        last_msg.text[:60]
                        if getattr(
                            last_msg,
                            "text",
                            None
                        )
                        else ""
                    )
                    or
                    (
                        last_msg.encrypted_text[:60]
                        if last_msg.encrypted_text
                        else ""
                    )
                ),
                "created_at":
                    last_msg.created_at,
                "fromUserId":
                    last_msg.sender_id,
                "last_sender_id":
                    last_msg.sender_id,
                "media_type":
                    last_msg.media_type,
                "status": message_status,
                "unseen":
                    unseen_count,
                "pinned":
                    participant.pinned,
                "pinned_at": participant.pinned_at,
                "is_muted":
                    is_muted,
            })
    
        return Response({
            "results": data,
            "has_next":
                page_obj.has_next(),
            "next_page":
                page + 1
                if page_obj.has_next()
                else None,
            "pinned_count":
                ChatParticipant.objects.filter(
                    user=user,
                    pinned=True
                ).count(),
        })
    
    @action(
        detail=True,
        methods=["POST"],
        url_path="pin"
    )
    def pin_chat(self, request, pk=None):
        participant, _ = (
            ChatParticipant.objects
            .get_or_create(
                chat_id=pk,
                user=request.user
            )
        )
    
        # trying to pin
        if not participant.pinned:
            pinned_count = (
                ChatParticipant.objects
                .filter(
                    user=request.user,
                    pinned=True
                )
                .count()
            )
    
            if pinned_count >= 5:
                return Response(
                    {
                        "error":
                        "You can only pin up to 5 chats."
                    },
                    status=400
                )
    
            participant.pinned = True
            participant.pinned_at = timezone.now()
    
        else:
            # unpin
            participant.pinned = False
            participant.pinned_at = None
    
        participant.save()
    
        return Response({
            "chat_id": int(pk),
            "pinned": participant.pinned,
            "pinned_at": participant.pinned_at,
            "pinned_count":
                ChatParticipant.objects.filter(
                    user=request.user,
                    pinned=True
                ).count()
        })
    
    @action(
        detail=True,
        methods=["POST"],
        url_path="archive"
    )
    def archive_chat(self, request, pk=None):
        participant, _ = (
            ChatParticipant.objects
            .get_or_create(
                chat_id=pk,
                user=request.user
            )
        )
    
        participant.archived = (
            not participant.archived
        )
    
        participant.archived_at = (
            timezone.now()
            if participant.archived
            else None
        )
    
        participant.save()
    
        return Response({
            "archived": participant.archived
        })
    
    @action(
        detail=True,
        methods=["POST"],
        url_path="delete-chat"
    )
    def delete_chat(self, request, pk=None):
        chat = self.get_object()
    
        participant, _ = ChatParticipant.objects.get_or_create(
            chat=chat,
            user=request.user
        )
    
        participant.deleted = True
        participant.deleted_at = timezone.now()
        participant.save()
    
        return Response({
            "success": True
        })
    
    @action(
        detail=False,
        methods=["POST"],
        url_path="delete-chats"
    )
    def delete_chats(self, request):
        chat_ids = request.data.get(
            "chat_ids",
            []
        )
    
        for chat_id in chat_ids:
            participant, _ = (
                ChatParticipant.objects
                .get_or_create(
                    chat_id=chat_id,
                    user=request.user
                )
            )
    
            participant.deleted = True
            participant.deleted_at = timezone.now()
            participant.save(
                update_fields=[
                    "deleted",
                    "deleted_at",
                ]
            )
    
        return Response({
            "success": True
        })
  
    @action(
        detail=True,
        methods=["POST"],
        url_path="mute"
    )
    def mute_chat(self, request, pk=None):
        duration = request.data.get(
            "duration",
            "8h"
        )
    
        participant, _ = ChatParticipant.objects.get_or_create(
            chat=self.get_object(),
            user=request.user
        )
    
        if duration == "forever":
            participant.is_muted = True
            participant.muted_until = None
        
        elif duration == "8h":
            participant.is_muted = True
            participant.muted_until = (
                timezone.now() +
                timedelta(hours=8)
            )
        
        elif duration == "1w":
            participant.is_muted = True
            participant.muted_until = (
                timezone.now() +
                timedelta(days=7)
            )
    
        participant.save()
    
        return Response({
            "muted_until":
                participant.muted_until,
            "duration": duration
        })
    
    @action(
        detail=True,
        methods=["POST"],
        url_path="unmute"
    )
    def unmute_chat(self, request, pk=None):
        participant = ChatParticipant.objects.filter(
            chat=self.get_object(),
            user=request.user
        ).first()
    
        if participant:
            participant.is_muted = False
            participant.muted_until = None
            participant.save()
    
        return Response({
            "success": True
        })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_detail(request, chat_id):
    chat = get_object_or_404(
        Chat,
        id=chat_id,
        members=request.user
    )

    participant = (
        ChatParticipant.objects
        .filter(
            chat=chat,
            user=request.user
        )
        .first()
    )
    
    if (
        participant
        and participant.is_muted
        and participant.muted_until
        and participant.muted_until <= timezone.now()
    ):
        participant.is_muted = False
        participant.muted_until = None
        participant.save()

    other_user = (
        chat.members
        .exclude(id=request.user.id)
        .first()
    )

    is_message_blocked = False
    blocked_me = False

    if other_user:
        is_message_blocked = (
            MessageBlockedUser.objects.filter(
                user=request.user,
                blocked_user=other_user
            ).exists()
        )

        blocked_me = (
            MessageBlockedUser.objects.filter(
                user=other_user,
                blocked_user=request.user
            ).exists()
        )

    message_status = None

    last_msg = (
        chat.messages
        .exclude(hidden_for=request.user)
        .filter(is_deleted=False)
        .order_by("-created_at")
        .first()
    )
    
    if (
        last_msg
        and last_msg.sender_id == request.user.id
        and other_user
    ):
        other_participant = (
            ChatParticipant.objects
            .filter(chat=chat)
            .exclude(user=request.user)
            .first()
        )
    
        other_read_state = (
            ChatReadState.objects
            .filter(
                chat=chat,
                user=other_user
            )
            .first()
        )
    
        if (
            other_read_state and
            other_read_state.last_seen_message_id and
            other_read_state.last_seen_message_id >=
            last_msg.id
        ):
            message_status = "seen"
        
        elif (
            other_participant and
            other_participant.last_delivered_message_id and
            other_participant.last_delivered_message_id >=
            last_msg.id
        ):
            message_status = "delivered"
        
        else:
            message_status = "sent"

    return Response({
        "chat_id": chat.id,
        "members": list(
            chat.members.values(
                "id",
                "username",
                "avatar"
            )
        ),
        "is_message_blocked":
            is_message_blocked,
        "blocked_me":
            blocked_me,
        "is_muted":
            participant.is_muted
            if participant else False,
        "muted_until":
            participant.muted_until
            if participant else None,
        "last_message": {
            "id": last_msg.id if last_msg else None,
            "sender_id": (
                last_msg.sender_id
                if last_msg
                else None
            ),
            "status": message_status,
        }
    })

def get_chat_messages(chat_id, user):
    return (
        Message.objects.filter(
            chat_id=chat_id,
            chat__members=user,
            is_deleted=False,
        )
        .exclude(hidden_for=user)
        .select_related(
            "sender",
            "chat",
            "reply_to",
            "reply_to__sender",
        )
        .prefetch_related(
            "reactions",
            "reactions__user",
        )
    )


def get_anchor_message(chat_id, user, anchor):
    if not anchor:
        return None

    return (
        get_chat_messages(chat_id, user)
        .filter(id=anchor)
        .first()
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def message_before(request, chat_id):

    anchor = request.GET.get("anchor")

    if not anchor:
        return Response(
            {
                "messages": [],
                "hasOlder": False,
            }
        )

    limit = int(request.GET.get("limit", 25))

    base = get_chat_messages(chat_id, request.user)

    older = list(
        base.filter(id__lt=anchor)
        .order_by("-id")[:limit]
    )

    older.reverse()

    has_older = (
        base.filter(id__lt=older[0].id).exists()
        if older
        else False
    )

    return Response(
        {
            "messages": MessageSerializer(
                older,
                many=True,
                context={"request": request},
            ).data,
            "hasOlder": has_older,
        }
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def message_after(request, chat_id):

    anchor = request.GET.get("anchor")

    if not anchor:
        return Response(
            {
                "messages": [],
                "hasNewer": False,
            }
        )

    limit = int(request.GET.get("limit", 25))

    base = get_chat_messages(chat_id, request.user)

    newer = list(
        base.filter(id__gt=anchor)
        .order_by("id")[:limit]
    )

    has_newer = (
        base.filter(id__gt=newer[-1].id).exists()
        if newer
        else False
    )

    return Response(
        {
            "messages": MessageSerializer(
                newer,
                many=True,
                context={"request": request},
            ).data,
            "hasNewer": has_newer,
        }
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def message_window(request, chat_id):

    anchor = request.GET.get("anchor")

    before = int(request.GET.get("before", 25))
    after = int(request.GET.get("after", 25))

    base = get_chat_messages(chat_id, request.user)

    # First open chat
    if not anchor:

        latest = list(
            base.order_by("-id")[: before + after]
        )

        latest.reverse()

        return Response(
            {
                "messages": MessageSerializer(
                    latest,
                    many=True,
                    context={"request": request},
                ).data,
                "hasOlder": (
                    base.filter(id__lt=latest[0].id).exists()
                    if latest
                    else False
                ),
                "hasNewer": False,
            }
        )

    anchor_message = get_anchor_message(
        chat_id,
        request.user,
        anchor,
    )

    if not anchor_message:
        return Response(
            {
                "messages": [],
                "hasOlder": False,
                "hasNewer": False,
            }
        )

    older = list(
        base.filter(id__lt=anchor)
        .order_by("-id")[:before]
    )

    older.reverse()

    newer = list(
        base.filter(id__gt=anchor)
        .order_by("id")[:after]
    )

    messages = [
        *older,
        anchor_message,
        *newer,
    ]

    return Response(
        {
            "messages": MessageSerializer(
                messages,
                many=True,
                context={"request": request},
            ).data,
            "hasOlder": (
                base.filter(id__lt=messages[0].id).exists()
                if messages
                else False
            ),
            "hasNewer": (
                base.filter(id__gt=messages[-1].id).exists()
                if messages
                else False
            ),
        }
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def block_messages(request, user_id):
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=404
        )

    if target == request.user:
        return Response(
            {"error": "You cannot block yourself"},
            status=400
        )

    MessageBlockedUser.objects.get_or_create(
        user=request.user,
        blocked_user=target
    )

    return Response({
        "success": True,
        "blocked": True,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unblock_messages(request, user_id):
    MessageBlockedUser.objects.filter(
        user=request.user,
        blocked_user_id=user_id
    ).delete()

    return Response({
        "success": True,
        "blocked": False,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_seen(request):
    chat_id = request.data.get("chatId")
    user = request.user

    try:
        chat = Chat.objects.get(
            id=chat_id,
            members=user,
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
            members=user,
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
        .filter(members=user)
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

    is_message_blocked = (
        MessageBlockedUser.objects.filter(
            user=user1,
            blocked_user=user2
        ).exists()
    )
    
    blocked_me = (
        MessageBlockedUser.objects.filter(
            user=user2,
            blocked_user=user1
        ).exists()
    )

    chat_key = generate_chat_key(
        user1.id,
        user2.id
    )

    chat, created = Chat.objects.get_or_create(
        chat_key=chat_key
    )
    
    chat.members.add(user1, user2)
    
    participant1, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=user1
    )
    participant1.deleted = False
    participant1.archived = False
    participant1.save(
        update_fields=[
            "deleted",
            "archived",
        ]
    )
    
    participant2, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=user2
    )
    participant2.deleted = False
    participant2.archived = False
    participant2.save(
        update_fields=[
            "deleted",
            "archived",
        ]
    )
  
    return Response({
        "chat_id": chat.id,
        "chat_key": chat.chat_key,
        "is_message_blocked":
            is_message_blocked,
        "blocked_me":
            blocked_me,
        "other_user": {
            "id": user2.id,
            "username": user2.username,
            "avatar": getattr(
                user2,
                "avatar",
                None
            ),
        }
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hide_all_messages(request, chat_id):
    user = request.user

    messages = Message.objects.filter(
        chat_id=chat_id,
        chat__members=user
    ).exclude(
        hidden_for=user
    )
    
    messages_count = messages.count()
    
    for msg in messages.iterator():
        msg.hidden_for.add(user)

    return Response(
        {
            "success": True,
            "hidden_count": messages.count(),
        },
        status=status.HTTP_200_OK,
    )

def soft_delete_message(message, user):
    chat = message.chat

    is_admin = chat.is_chat_admin(user)
    is_owner = message.sender_id == user.id

    if not is_owner and not is_admin:
        raise PermissionDenied("No permission to delete this message")

    message.is_deleted = True
    message.deleted_at = timezone.now()

    if chat.chat_type == "community" and is_admin and not is_owner:
        message.deleted_by_admin = True
        message.text = "Deleted by administrator"
    else:
        message.text = "Deleted message"

    message.encrypted_text = ""
    message.media_url = None
    message.thumbnail = None
    message.reply_to = None
    message.save()
    
    if chat.last_message_id == message.id:
        last_message = (
            Message.objects.filter(
                chat=chat,
                is_deleted=False
            )
            .exclude(id=message.id)
            .order_by("-created_at")
            .first()
        )
    
        chat.last_message = last_message
        chat.save(update_fields=["last_message"])

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
        ).filter(
            is_deleted=False
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
      chat = Chat.objects.get(
          id=self.kwargs["chat_id"]
      )
    
      user = self.request.user
    
      other_user = (
        chat.members
        .exclude(id=user.id)
        .first()
      )
    
      if other_user:
        blocked = (
          MessageBlockedUser.objects.filter(
            user=user,
            blocked_user=other_user
          ).exists()
        )
    
        blocked_me = (
          MessageBlockedUser.objects.filter(
            user=other_user,
              blocked_user=user
          ).exists()
        )
    
        if blocked or blocked_me:
          raise PermissionDenied(
            "Messaging is unavailable."
        )
    
      encrypted_text = self.request.data.get("encrypted_text") 
      caption = self.request.data.get("caption")
      client_id=self.request.data.get("client_id")

      media_url = serializer.validated_data.get("media_url") or []
      thumbnail = serializer.validated_data.get("thumbnail")
      duration = serializer.validated_data.get("duration", [])
      waveform = serializer.validated_data.get("waveform", [])
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
  
      save_kwargs = {
          "sender": user,
          "chat": chat,
          "encrypted_text": encrypted_text,
          "caption": caption,
          "thumbnail": thumbnail,
          "waveform": waveform,
          "duration": duration,
          "media_type": media_type,
          "reply_to": reply_to,
      }
  
      # Only include media_url if it was actually provided
      if media_url is not None:
          save_kwargs["media_url"] = media_url or []
      
      message = serializer.save(**save_kwargs)
  
      print("SAVED encrypted_text =", message.encrypted_text)
      print("SAVING to model =", save_kwargs)
  
      chat.last_message = message
      chat.updated_at = message.created_at
      chat.save(update_fields=["last_message", "updated_at"])
  
      for member in chat.members.all():
        participant, _ = ChatParticipant.objects.get_or_create(
            chat=chat,
            user=member
        )
    
        if participant.deleted:
            participant.deleted = False
            participant.deleted_at = None
    
        if participant.archived:
            participant.archived = False
    
        participant.save(
            update_fields=[
                "deleted",
                "deleted_at",
                "archived",
            ]
        )
  
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

    @action(detail=True, methods=["post"])
    def report(self, request, pk=None):
        message = self.get_object()
    
        report, created = Report.objects.get_or_create(
            reporter=request.user,
            report_type="message",
            target_message=message,
            defaults={
                "reason": request.data.get("reason"),
                "details": request.data.get("details", "")
            }
        )
    
        if not created:
            return Response(
                {"message": "You already reported this message"},
                status=400
            )
    
        return Response({
            "success": True,
            "message": "Message reported successfully"
        })

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