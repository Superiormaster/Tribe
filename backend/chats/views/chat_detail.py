from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404
from django.utils import timezone

from chats.models import (
    Chat,
    ChatReadState,
    ChatParticipant,
    MessageBlockedUser,
)

from communities.models import (
    Community,
    CommunityMembership,
    CommunityMute,
    CommunityBan,
)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_detail(request, chat_id):
    chat = get_object_or_404(Chat, id=chat_id)

    if not ChatParticipant.objects.filter(
        chat=chat,
        user=request.user
    ).exists():
        return Response({"detail": "Not found"}, status=404)

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

    participants = ChatParticipant.objects.filter(chat=chat)

    print("CHAT:", chat.id)

    for p in participants:
        print(
            "Participant:",
            p.user_id,
            p.user.username,
        )

    other_participant = (
        ChatParticipant.objects
        .select_related("user")
        .filter(chat=chat)
        .exclude(user=request.user)
        .first()
    )
    
    other_user = other_participant.user if other_participant else None

    if chat.chat_type == "private" and other_user is None:
      return Response(
          {
              "detail": "Chat is missing a participant."
          },
          status=409,
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
    
        "other_user": {
            "id": other_user.id,
            "username": other_user.username,
            "avatar": (
                request.build_absolute_uri(other_user.avatar)
                if other_user and other_user.avatar
                else None
            ),
            "fcm_token": other_user.fcm_token,
        } if other_user else None,
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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def community_detail(request, community_id):
    community = get_object_or_404(
        Community,
        id=community_id
    )

    member_count = CommunityMembership.objects.filter(
        community=community
    ).count()

    membership = CommunityMembership.objects.filter(
        community=community,
        user=request.user,
    ).first()
    
    if not membership:
        return Response(
            {"detail": "Not a member."},
            status=403
        )
    
    ban = CommunityBan.objects.filter(
        community=community,
        user=request.user,
    ).first()
    
    if ban and ban.is_active:
      return Response(
          {
              "detail": "You are banned from this community.",
              "is_banned": True,
              "banned_until": ban.banned_until,
              "permanent_ban": ban.permanent,
          },
          status=403,
      )

    # -------------------------
    # ACTIVE MUTE
    # -------------------------
    mute = CommunityMute.objects.filter(
        community=community,
        user=request.user,
    ).first()

    is_muted = False
    muted_until = None

    if mute:
        if mute.is_active:
            is_muted = True
            muted_until = mute.muted_until
        else:
            mute.delete()

    return Response({
        "community_id": community.id,
        "name": community.name,
        "owner_id": community.owner_id,
        "member_count": member_count,

        "role": membership.role,

        "is_muted": is_muted,
        "muted_until": muted_until,

        "require_post_approval":
            community.require_post_approval,

        "join_approval_required":
            community.join_approval_required,
    })