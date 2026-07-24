from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied

from chats.models import (
    Message,
    Chat,
    ChatReadState,
    ChatParticipant,
    MessageBlockedUser,
)

from chats.serializers import (
    PrivateMessageSerializer,
    CommunityMessageSerializer,
)

from chats.utils.create_message import build_message_kwargs

from communities.models import (
    Community,
    CommunityMembership,
)

class CommunityMessageViewSet(viewsets.ModelViewSet):
    serializer_class = CommunityMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        community_id = self.kwargs["community_id"]

        return (
            Message.objects.filter(
                community_id=community_id,
                community__memberships__user=user,
                is_deleted=False,
                deleted_by_admin=False,
            )
            .exclude(hidden_for=user)
            .select_related(
                "sender",
                "chat",
                "community",
                "reply_to",
                "reply_to__sender",
            )
            .prefetch_related(
                "reactions",
                "reactions__user",
                "mentions",
            )
            .order_by("created_at")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        community = get_object_or_404(
            Community,
            id=self.kwargs["community_id"],
        )

        chat = get_object_or_404(
            Chat,
            community=community,
            chat_type="community",
        )

        user = self.request.user

        if not CommunityMembership.objects.filter(
            community=community,
            user=user,
        ).exists():
            raise PermissionDenied(
                "You are not a member of this community."
            )

        if chat.is_locked or getattr(community, "chat_locked", False):
            raise PermissionDenied(
                "Community chat is locked."
            )

        save_kwargs, mentions = build_message_kwargs(
            self.request,
            serializer,
            chat,
            community,
        )

        message = serializer.save(**save_kwargs)

        if mentions:
            message.mentions.set(mentions)

        chat.last_message = message
        chat.updated_at = message.created_at
        chat.save(
            update_fields=[
                "last_message",
                "updated_at",
            ]
        )

        return message

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = self.perform_create(serializer)

        output = self.get_serializer(message)

        return Response(
            output.data,
            status=status.HTTP_201_CREATED,
            headers=self.get_success_headers(output.data),
        )

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = PrivateMessageSerializer
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
  
      save_kwargs, mentions = build_message_kwargs(
          self.request,
          serializer,
          chat,
      )
  
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