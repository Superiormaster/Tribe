from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.db import OperationalError
import time
from users.utils import get_user_avatar

from chats.models import (
    Message,
    Chat,
    ChatReadState,
    ChatParticipant,
    MessageBlockedUser,
    MessageMention,
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

class CommunityMemberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

def get_private_inbox_user_ids(
    chat,
    sender_id,
):
    return list(
        ChatParticipant.objects
        .filter(
            chat_id=chat.id,
            deleted=False,
        )
        .exclude(
            user_id=sender_id,
        )
        .values_list(
            "user_id",
            flat=True,
        )
    )

def get_community_inbox_user_ids(
    chat,
    sender_id,
):
    return list(
        ChatParticipant.objects
        .filter(
            chat_id=chat.id,
            deleted=False,
        )
        .exclude(
            user_id=sender_id
        )
        .values_list(
            "user_id",
            flat=True,
        )
    )

def get_community_chat_members(chat):
    participants = (
        ChatParticipant.objects
        .filter(
            chat_id=chat.id,
            deleted=False,
        )
        .select_related("user")
        .only(
            "user_id",
            "user__username",
            "user__avatar",
        )
    )

    return [
        {
            "id": p.user_id,
            "username": p.user.username,
            "avatar": get_user_avatar(p.user),
        }
        for p in participants
    ]

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
                "mentions__user",
                "media_assets",
            )
            .order_by("created_at")
        )

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
  
      (
          save_kwargs,
          mention_user_ids,
          media_assets,
      ) = build_message_kwargs(
          self.request,
          serializer,
          chat,
          community,
      )
  
      save_kwargs["chat"] = chat
      save_kwargs["sender"] = user
      save_kwargs["community"] = community
  
      print(
          "🔥 REPLY VALIDATED:",
          serializer.validated_data.get("reply_to")
      )
      
      print(
          "🔥 REPLY ID:",
          getattr(
              serializer.validated_data.get("reply_to"),
              "id",
              None
          )
      )

      for attempt in range(3):
          try:
              with transaction.atomic():
  
                  message = serializer.save(
                      **save_kwargs
                  )
  
                  print(
                      "🔥 SAVED REPLY:",
                      message.reply_to_id
                  )
  
                  if media_assets:
                      message.media_assets.set(
                          media_assets
                      )
  
                  if mention_user_ids:
  
                      requested_ids = set(
                          mention_user_ids
                      )
  
                      member_ids = set(
                          CommunityMembership.objects
                          .filter(
                              community=community,
                              user_id__in=requested_ids,
                          )
                          .values_list(
                              "user_id",
                              flat=True,
                          )
                      )
  
                      invalid_ids = (
                          requested_ids - member_ids
                      )
  
                      if invalid_ids:
                          raise PermissionDenied(
                              "One or more mentioned users are "
                              "not members of this community."
                          )
  
                      MessageMention.objects.bulk_create(
                          [
                              MessageMention(
                                  message=message,
                                  user_id=user_id,
                              )
                              for user_id in member_ids
                          ],
                          ignore_conflicts=True,
                      )
  
                  mention_all = (
                      serializer.validated_data.get(
                          "mention_all",
                          False,
                      )
                  )
  
                  if mention_all:
                      message.mention_all = True
  
                      message.save(
                          update_fields=[
                              "mention_all"
                          ]
                      )
  
                  # Update chat preview
                  chat.last_message = message
                  chat.updated_at = message.created_at
  
                  chat.save(
                      update_fields=[
                          "last_message",
                          "updated_at",
                      ]
                  )
  
              return message
  
          except OperationalError as exc:
  
              if "database is locked" not in str(exc).lower():
                  raise
  
              if attempt == 2:
                  raise
  
              time.sleep(
                  0.5 * (attempt + 1)
              )

    def create(self, request, *args, **kwargs):
      serializer = self.get_serializer(data=request.data)
  
      if not serializer.is_valid():
          print("\n================ COMMUNITY MESSAGE VALIDATION ERROR ================")
          print("REQUEST DATA:")
          print(request.data)
          print("\nSERIALIZER ERRORS:")
          print(serializer.errors)
          print("====================================================================\n")
  
          return Response(
              {
                  "detail": "Invalid community message.",
                  "errors": serializer.errors,
              },
              status=status.HTTP_400_BAD_REQUEST,
          )
  
      message = self.perform_create(serializer)
  
      output = self.get_serializer(message)
  
      chat = (
          Chat.objects
          .filter(id=message.chat_id)
          .first()
      )
  
      members = get_community_chat_members(chat)
  
      inbox_user_ids = get_community_inbox_user_ids(
          chat,
          request.user.id,
      )

      response_data = {
          **output.data,
          "members": members,
          "inbox_user_ids": inbox_user_ids,
      }
  
      return Response(
          response_data,
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
            chat__participants__user=user,
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
            "reactions__user",
            "media_assets",
        ).order_by("created_at")

    def perform_create(self, serializer):

      chat = get_object_or_404(
          Chat,
          id=self.kwargs["chat_id"],
      )
  
      user = self.request.user
  
      if not ChatParticipant.objects.filter(
          chat=chat,
          user=user,
      ).exists():
          raise PermissionDenied(
              "You are not a participant in this chat."
          )
  
      other_participant = (
          ChatParticipant.objects
          .filter(chat=chat)
          .exclude(user_id=user.id)
          .select_related("user")
          .first()
      )
  
      other_user = (
          other_participant.user
          if other_participant
          else None
      )
  
      if other_user:
  
          blocked = (
              MessageBlockedUser.objects.filter(
                  user=user,
                  blocked_user=other_user,
              ).exists()
          )
  
          blocked_me = (
              MessageBlockedUser.objects.filter(
                  user=other_user,
                  blocked_user=user,
              ).exists()
          )
  
          if blocked or blocked_me:
              raise PermissionDenied(
                  "Messaging is unavailable."
              )
  
      (
          save_kwargs,
          mention_user_ids,
          media_assets,
      ) = build_message_kwargs(
          self.request,
          serializer,
          chat,
      )
  
      if mention_user_ids:
          raise PermissionDenied(
              "Mentions are only available in community chats."
          )
  
      print(
          "🔥 REPLY VALIDATED:",
          serializer.validated_data.get("reply_to")
      )
      
      print(
          "🔥 REPLY ID:",
          getattr(
              serializer.validated_data.get("reply_to"),
              "id",
              None
          )
      )

      for attempt in range(3):
  
          try:
  
              with transaction.atomic():
  
                  message = serializer.save(
                      **save_kwargs
                  )
                  print(
                      "🔥 SAVED REPLY:",
                      message.reply_to_id
                  )
  
                  if media_assets:
                      message.media_assets.set(
                          media_assets
                      )
  
                  chat.last_message = message
                  chat.updated_at = message.created_at
  
                  chat.save(
                      update_fields=[
                          "last_message",
                          "updated_at",
                      ]
                  )
  
                  participants = (
                      ChatParticipant.objects
                      .filter(chat=chat)
                  )
  
                  for participant in participants:
  
                      update_fields = []
  
                      if participant.deleted:
  
                          participant.deleted = False
                          participant.deleted_at = None
  
                          update_fields.extend([
                              "deleted",
                              "deleted_at",
                          ])
  
                      if participant.archived:
  
                          participant.archived = False
  
                          update_fields.append(
                              "archived"
                          )
  
                      if update_fields:
  
                          participant.save(
                              update_fields=update_fields
                          )
  
                  ChatReadState.objects.update_or_create(
                      user=user,
                      chat=chat,
                      defaults={
                          "last_seen_message": message
                      },
                  )
  
              return message
  
          except OperationalError as exc:
  
              if "database is locked" not in str(exc).lower():
                  raise
  
              if attempt == 2:
                  raise
  
              time.sleep(
                  0.5 * (attempt + 1)
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

class CommunityMentionMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, community_id):
        community = (
            Community.objects
            .filter(id=community_id)
            .first()
        )

        if not community:
            return Response(
                {"detail": "Community not found."},
                status=404,
            )

        is_member = CommunityMembership.objects.filter(
            community=community,
            user=request.user,
        ).exists()

        if not is_member:
            return Response(
                {"detail": "You are not a member of this community."},
                status=403,
            )

        search = request.query_params.get("search", "").strip()

        members = (
            CommunityMembership.objects
            .filter(community=community)
            .select_related("user")
            .exclude(user=request.user)
            .order_by("user__username")
        )

        if search:
            members = members.filter(
                Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )

        paginator = CommunityMemberPagination()

        page = paginator.paginate_queryset(
            members,
            request,
        )

        results = []

        for member in page:
            user = member.user

            results.append({
                "id": user.id,
                "username": user.username,
                "avatar": get_user_avatar(user),
            })

        return paginator.get_paginated_response(results)