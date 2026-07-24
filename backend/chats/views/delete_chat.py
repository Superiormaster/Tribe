from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from communities.models import CommunityMembership

from chats.models import Chat, ChatParticipant

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_chat(request, chat_id):
    chat = get_object_or_404(Chat, pk=chat_id)

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=request.user,
    )

    participant.deleted = True
    participant.deleted_at = timezone.now()
    participant.save(update_fields=["deleted", "deleted_at"])

    return Response({
        "success": True,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_chats(request):
    chat_ids = request.data.get("chat_ids", [])

    for chat_id in chat_ids:
        participant, _ = ChatParticipant.objects.get_or_create(
            chat_id=chat_id,
            user=request.user,
        )

        participant.deleted = True
        participant.deleted_at = timezone.now()
        participant.save(update_fields=[
            "deleted",
            "deleted_at",
        ])

    return Response({
        "success": True,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_community_chat(request, chat_id):
    chat = get_object_or_404(
        Chat,
        pk=chat_id,
        chat_type="community",
    )
  
    if not CommunityMembership.objects.filter(
        community=chat.community,
        user=request.user,
    ).exists():
        return Response(
            {"detail": "You are not a member of this community."},
            status=status.HTTP_403_FORBIDDEN,
        )

    participant, _ = ChatParticipant.objects.get_or_create(
        chat=chat,
        user=request.user,
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
        "success": True,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_community_chats(request):
    chat_ids = request.data.get("chat_ids", [])

    chats = Chat.objects.filter(
        id__in=chat_ids,
        chat_type="community",
    )

    for chat in chats:
        if not CommunityMembership.objects.filter(
            community=chat.community,
            user=request.user,
        ).exists():
            continue

        participant, _ = ChatParticipant.objects.get_or_create(
            chat=chat,
            user=request.user,
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
        "success": True,
    })