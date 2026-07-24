from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from django.core.paginator import Paginator
from django.utils import timezone

from users.models import BlockedUser

from chats.models import (
    Chat,
    ChatParticipant,
    ChatReadState,
)
from communities.models import CommunityMute

from chats.serializers import ChatSerializer

class ChatMessagePagination(PageNumberPagination):
    page_size = 20

class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
      return Chat.objects.filter(
          participants__user=self.request.user
      ).distinct()

    def perform_create(self, serializer):
        chat = serializer.save()
        ChatParticipant.objects.create(
            chat=chat,
            user=self.request.user
        )

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
            .prefetch_related(
              "chat__participants__user",
            )
            .select_related(
                "chat",
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
    
            members = [
              p.user
              for p in chat.participants.all()
            ]
    
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
                "chat_type": "private",
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
                    chat__chat_type="private",
                    pinned=True
                ).count(),
        })

    @action(detail=False, methods=["GET"], url_path="community-recent")
    def recent_communities(self, request):
        user = request.user
    
        page = int(request.query_params.get("page", 1))
        page_size = 20
    
        participants = (
            ChatParticipant.objects.filter(
                user=user,
                deleted=False,
                archived=False,
                chat__chat_type="community",
            )
            .select_related(
                "chat",
                "chat__community",
            )
            .order_by(
                "-pinned",
                "-pinned_at",
                "-chat__updated_at",
            )
        )
    
        paginator = Paginator(participants, page_size)
        page_obj = paginator.get_page(page)
    
        data = []
    
        for participant in page_obj:
            chat = participant.chat
            community = chat.community
    
            if not community:
                continue
    
            last_msg = (
                chat.messages.exclude(hidden_for=user)
                .filter(
                    is_deleted=False,
                    deleted_by_admin=False,
                )
                .select_related("sender")
                .order_by("-created_at")
                .first()
            )
    
            if not last_msg:
                continue
    
            read_state = (
                ChatReadState.objects.filter(
                    user=user,
                    chat=chat,
                ).first()
            )
    
            last_seen_id = (
                read_state.last_seen_message_id
                if read_state and read_state.last_seen_message
                else 0
            )
    
            unseen_count = (
                chat.messages.exclude(hidden_for=user)
                .filter(
                    is_deleted=False,
                    deleted_by_admin=False,
                    id__gt=last_seen_id,
                )
                .exclude(sender=user)
                .count()
            )
    
            mute = CommunityMute.objects.filter(
                community=community,
                user=user,
            ).first()
    
            is_muted = False
    
            if mute and mute.is_active:
                if (
                    mute.muted_until is None
                    or mute.muted_until > timezone.now()
                ):
                    is_muted = True
                else:
                    mute.is_active = False
                    mute.muted_until = None
                    mute.save(
                        update_fields=[
                            "is_active",
                            "muted_until",
                        ]
                    )
    
            data.append({
                "community_id": community.id,
                "chat_type": "community",
                "chat_id": chat.id,
                "community_name": community.name,
                "community_cover": community.cover_image,
    
                "username": last_msg.sender.username,
                "avatar": getattr(
                    last_msg.sender,
                    "avatar",
                    None,
                ),
    
                "text": (
                    (
                        last_msg.caption[:60]
                        if last_msg.caption
                        else ""
                    )
                    or (
                        last_msg.encrypted_text[:60]
                        if last_msg.encrypted_text
                        else ""
                    )
                ),
    
                "created_at": last_msg.created_at,
                "last_sender_id": last_msg.sender_id,
                "media_type": last_msg.media_type,
    
                "unseen": unseen_count,
    
                "pinned": participant.pinned,
                "pinned_at": participant.pinned_at,
    
                "is_muted": is_muted,
            })
    
        return Response({
            "results": data,
            "has_next": page_obj.has_next(),
            "next_page": (
                page + 1
                if page_obj.has_next()
                else None
            ),
            "pinned_count": ChatParticipant.objects.filter(
                user=user,
                chat__chat_type="community",
                pinned=True,
            ).count(),
        })