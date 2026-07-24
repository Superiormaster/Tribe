from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth import get_user_model

from chats.models import (
    Chat,
    ChatParticipant,
    MessageBlockedUser,
)
from rest_framework import status
from django.shortcuts import get_object_or_404

from chats.serializers import ChatSerializer

from communities.models import CommunityMembership
from chats.utils.chat_key import generate_chat_key

User = get_user_model()

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
        chat_key=chat_key,
        defaults={
            "chat_type": "private",
            "created_by": user1,
        },
    )
  
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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_community_chat(request, chat_id):
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
            {
                "detail": "You are not a member of this community."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=user,
    )

    if participant.deleted:
        participant.deleted = False
        participant.deleted_at = None
        participant.save(
            update_fields=[
                "deleted",
                "deleted_at",
            ]
        )

    serializer = ChatSerializer(
        chat,
        context={"request": request},
    )

    return Response(
        {
            "success": True,
            "chat": serializer.data,
        }
    )