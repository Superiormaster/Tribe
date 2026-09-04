from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from django.core.paginator import Paginator
from django.utils import timezone

from django.db.models import (
    Q,
    Count,
    Max,
    OuterRef,
    Subquery,
    Case,
    When,
    F,
    DateTimeField,
)

from users.models import BlockedUser
from users.utils import get_user_avatar

from chats.models import (
    Chat,
    ChatParticipant,
    ChatReadState,
    Message,
    MessageMention,
)

from communities.models import CommunityMute

from chats.serializers import ChatSerializer

def serialize_reply_snapshot(message):
    """
    Return the reply snapshot stored on a message.
    """

    reply = getattr(message, "reply_to", None)

    if not reply:
        return None

    if isinstance(reply, dict):
        return reply

    return {
        "id": getattr(reply, "id", None),
        "client_id": getattr(reply, "client_id", None),
        "sender_id": getattr(reply, "sender_id", None),

        "sender_username": (
            reply.sender.username
            if getattr(reply, "sender", None)
            else None
        ),

        "text": getattr(
            reply,
            "text",
            "",
        ) or "",

        "encrypted_text": getattr(
            reply,
            "encrypted_text",
            "",
        ) or "",

        "caption": getattr(
            reply,
            "caption",
            "",
        ) or "",

        "media_type": getattr(
            reply,
            "media_type",
            "text",
        ),

        "media_url": getattr(
            reply,
            "media_url",
            [],
        ) or [],

        "thumbnail": getattr(
            reply,
            "thumbnail",
            [],
        ) or [],
    }


def get_message_text(message, community=False):
    """
    Keep the existing preview behavior.
    """

    if community:
        return (
            (
                message.caption[:60]
                if getattr(
                    message,
                    "caption",
                    None,
                )
                else ""
            )
            or
            (
                message.encrypted_text[:60]
                if getattr(
                    message,
                    "encrypted_text",
                    None,
                )
                else ""
            )
        )

    return (
        (
            message.text[:60]
            if getattr(
                message,
                "text",
                None,
            )
            else ""
        )
        or
        (
            message.encrypted_text[:60]
            if getattr(
                message,
                "encrypted_text",
                None,
            )
            else ""
        )
    )


def get_unseen_counts(
    user,
    chat_ids,
    last_seen_by_chat,
    community=False,
):
    """
    One query for unseen counts for all chats.
    """

    if not chat_ids:
        return {}

    conditions = Q(pk__in=[])

    for chat_id in chat_ids:

        last_seen_id = (
            last_seen_by_chat.get(
                chat_id,
                0,
            )
            or 0
        )

        conditions |= Q(
            chat_id=chat_id,
            id__gt=last_seen_id,
        )

    messages = (
        Message.objects
        .filter(
            conditions,
            is_deleted=False,
        )
        .exclude(
            hidden_for=user,
        )
        .exclude(
            sender=user,
        )
    )

    if community:
        messages = messages.filter(
            deleted_by_admin=False,
        )

    rows = (
        messages
        .values("chat_id")
        .annotate(
            count=Count("id")
        )
    )

    return {
        row["chat_id"]: row["count"]
        for row in rows
    }

class ChatViewSet(viewsets.ModelViewSet):

    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return (
            Chat.objects
            .filter(
                participants__user=self.request.user
            )
            .distinct()
        )

    def perform_create(self, serializer):

        chat = serializer.save()

        ChatParticipant.objects.create(
            chat=chat,
            user=self.request.user,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="recent",
    )
    def recent(self, request):

        user = request.user

        page = int(
            request.query_params.get(
                "page",
                1,
            )
        )

        page_size = 20

        blocked_relations = (
            BlockedUser.objects
            .filter(
                Q(user=user) |
                Q(blocked_user=user)
            )
            .values_list(
                "user_id",
                "blocked_user_id",
            )
        )

        blocked_user_ids = set()

        for user_id, blocked_user_id in blocked_relations:

            if user_id != user.id:
                blocked_user_ids.add(user_id)

            if blocked_user_id != user.id:
                blocked_user_ids.add(blocked_user_id)

        latest_message_subquery = (
            Message.objects
            .filter(
                chat=OuterRef("chat_id"),
                is_deleted=False,
            )
            .exclude(
                hidden_for=user,
            )
            .annotate(
                display_time=Case(
                    When(
                        sender=user,
                        client_created_at__isnull=False,
                        then=F("client_created_at"),
                    ),
                    default=F("created_at"),
                    output_field=DateTimeField(),
                )
            )
            .order_by(
                "-display_time",
                "-id",
            )
            .values("id")[:1]
        )

        participants = (
            ChatParticipant.objects
            .filter(
                user=user,
                deleted=False,
                archived=False,
                chat__chat_type="private",
            )
            .select_related(
                "chat",
            )
            .prefetch_related(
                "chat__participants__user",
            )
            .annotate(
                latest_message_id=Subquery(
                    latest_message_subquery
                )
            )
            .order_by(
                "-pinned",
                "-pinned_at",
                "-chat__updated_at",
            )
        )

        paginator = Paginator(
            participants,
            page_size,
        )

        page_obj = paginator.get_page(page)

        page_participants = list(
            page_obj.object_list
        )

        chat_ids = [
            participant.chat_id
            for participant in page_participants
        ]

        latest_message_ids = [
            participant.latest_message_id
            for participant in page_participants
            if participant.latest_message_id
        ]

        messages = (
            Message.objects
            .filter(
                id__in=latest_message_ids,
            )
            .select_related(
                "sender",
            )
        )

        message_map = {
            message.id: message
            for message in messages
        }
  
        read_states = (
            ChatReadState.objects
            .filter(
                chat_id__in=chat_ids,
            )
            .values(
                "chat_id",
                "user_id",
                "last_seen_message_id",
            )
        )

        current_read_state = {}

        other_read_state = {}

        for state in read_states:

            chat_id = state["chat_id"]
            state_user_id = state["user_id"]
            last_seen_id = (
                state["last_seen_message_id"]
                or 0
            )

            if state_user_id == user.id:

                current_read_state[
                    chat_id
                ] = last_seen_id

            else:

                other_read_state[
                    (
                        chat_id,
                        state_user_id,
                    )
                ] = last_seen_id

        unseen_counts = get_unseen_counts(
            user=user,
            chat_ids=chat_ids,
            last_seen_by_chat=current_read_state,
            community=False,
        )

        now = timezone.now()

        expired_participant_ids = []

        for participant in page_participants:

            if (
                participant.is_muted
                and participant.muted_until
                and participant.muted_until <= now
            ):
                expired_participant_ids.append(
                    participant.id
                )

        if expired_participant_ids:

            ChatParticipant.objects.filter(
                id__in=expired_participant_ids,
            ).update(
                is_muted=False,
                muted_until=None,
            )

        data = []

        for participant in page_participants:

            chat = participant.chat

            other_participant = next(
                (
                    p
                    for p in chat.participants.all()
                    if p.user_id != user.id
                ),
                None,
            )

            if not other_participant:
                continue

            other_user = other_participant.user

            if other_user.id in blocked_user_ids:
                continue

            last_msg = message_map.get(
                participant.latest_message_id
            )

            if not last_msg:
                continue

            message_status = None

            if last_msg.sender_id == user.id:

                other_seen_id = (
                    other_read_state.get(
                        (
                            chat.id,
                            other_user.id,
                        ),
                        0,
                    )
                )

                if (
                    other_seen_id
                    and other_seen_id >= last_msg.id
                ):
                    message_status = "seen"

                elif (
                    other_participant
                    and
                    other_participant.last_delivered_message_id
                    and
                    other_participant.last_delivered_message_id
                    >= last_msg.id
                ):
                    message_status = "delivered"

                else:
                    message_status = "sent"

            data.append({

                "chat_id":
                    chat.id,

                "chat_key":
                    chat.chat_key,

                "chat_type":
                    "private",

                "username":
                    other_user.username,

                "avatar":
                    get_user_avatar(
                        other_user
                    ),

                "text":
                    get_message_text(
                        last_msg,
                        community=False,
                    ),

                "created_at":
                    last_msg.created_at,

                "client_created_at":
                    last_msg.client_created_at,

                "display_created_at":
                    (
                        last_msg.client_created_at
                        if (
                            last_msg.sender_id == user.id
                            and
                            last_msg.client_created_at
                        )
                        else
                        last_msg.created_at
                    ),

                "fromUserId":
                    last_msg.sender_id,

                "last_sender_id":
                    last_msg.sender_id,

                "media_type":
                    last_msg.media_type,

                "reply_to":
                    serialize_reply_snapshot(
                        last_msg
                    ),

                "status":
                    message_status,

                "unseen":
                    unseen_counts.get(
                        chat.id,
                        0,
                    ),

                "pinned":
                    participant.pinned,

                "pinned_at":
                    participant.pinned_at,

                "is_muted":
                    (
                        participant.is_muted
                        if (
                            participant.is_muted
                            and (
                                participant.muted_until is None
                                or participant.muted_until > now
                            )
                        )
                        else False
                    ),
            })

        return Response({

            "results":
                data,

            "has_next":
                page_obj.has_next(),

            "next_page":
                (
                    page + 1
                    if page_obj.has_next()
                    else None
                ),

            "pinned_count":
                ChatParticipant.objects.filter(
                    user=user,
                    chat__chat_type="private",
                    pinned=True,
                ).count(),
        })

    @action(
        detail=False,
        methods=["GET"],
        url_path="community-recent",
    )
    def recent_communities(self, request):

        user = request.user

        page = int(
            request.query_params.get(
                "page",
                1,
            )
        )

        page_size = 20

        latest_message_subquery = (
            Message.objects
            .filter(
                chat=OuterRef("chat_id"),
                is_deleted=False,
                deleted_by_admin=False,
            )
            .exclude(
                hidden_for=user,
            )
            .annotate(
                display_time=Case(
                    When(
                        sender=user,
                        client_created_at__isnull=False,
                        then=F("client_created_at"),
                    ),
                    default=F("created_at"),
                    output_field=DateTimeField(),
                )
            )
            .order_by(
                "-display_time",
                "-id",
            )
            .values("id")[:1]
        )
  
        participants = (
            ChatParticipant.objects
            .filter(
                user=user,
                deleted=False,
                archived=False,
                chat__chat_type="community",
            )
            .select_related(
                "chat",
                "chat__community",
                "chat__community__cover_image_asset",
            )
            .annotate(
                latest_message_id=Subquery(
                    latest_message_subquery
                )
            )
            .order_by(
                "-pinned",
                "-pinned_at",
                "-chat__updated_at",
            )
        )

        paginator = Paginator(
            participants,
            page_size,
        )

        page_obj = paginator.get_page(page)

        page_participants = list(
            page_obj.object_list
        )

        chat_ids = [
            participant.chat_id
            for participant in page_participants
        ]

        community_ids = [
            participant.chat.community_id
            for participant in page_participants
            if participant.chat.community_id
        ]

        latest_message_ids = [
            participant.latest_message_id
            for participant in page_participants
            if participant.latest_message_id
        ]

        messages = (
            Message.objects
            .filter(
                id__in=latest_message_ids,
            )
            .select_related(
                "sender",
            )
        )

        message_map = {
            message.id: message
            for message in messages
        }

        read_states = (
            ChatReadState.objects
            .filter(
                chat_id__in=chat_ids,
            )
            .values(
                "chat_id",
                "user_id",
                "last_seen_message_id",
            )
        )

        current_read_state = {}

        other_seen_by_chat = {}

        for state in read_states:

            chat_id = state["chat_id"]

            state_user_id = (
                state["user_id"]
            )

            last_seen_id = (
                state["last_seen_message_id"]
                or 0
            )

            if state_user_id == user.id:

                current_read_state[
                    chat_id
                ] = last_seen_id

            else:

                previous = (
                    other_seen_by_chat.get(
                        chat_id,
                        0,
                    )
                )

                if last_seen_id > previous:

                    other_seen_by_chat[
                        chat_id
                    ] = last_seen_id

        unseen_counts = get_unseen_counts(
            user=user,
            chat_ids=chat_ids,
            last_seen_by_chat=current_read_state,
            community=True,
        )

        mentioned_message_ids = set(
            MessageMention.objects
            .filter(
                message_id__in=latest_message_ids,
                user_id=user.id,
            )
            .values_list(
                "message_id",
                flat=True,
            )
        )

        mutes = (
            CommunityMute.objects
            .filter(
                community_id__in=community_ids,
                user=user,
            )
        )

        mute_map = {
            mute.community_id: mute
            for mute in mutes
        }

        now = timezone.now()

        expired_mute_ids = []

        for mute in mutes:

            if (
                mute.is_active
                and mute.muted_until
                and mute.muted_until <= now
            ):
                expired_mute_ids.append(
                    mute.id
                )

        if expired_mute_ids:

            CommunityMute.objects.filter(
                id__in=expired_mute_ids,
            ).update(
                is_active=False,
                muted_until=None,
            )

            for mute in mutes:

                if mute.id in expired_mute_ids:

                    mute.is_active = False
                    mute.muted_until = None

        delivery_rows = (
            ChatParticipant.objects
            .filter(
                chat_id__in=chat_ids,
                deleted=False,
            )
            .exclude(
                user=user,
            )
            .values(
                "chat_id",
            )
            .annotate(
                max_delivered=Max(
                    "last_delivered_message_id"
                )
            )
        )

        delivered_by_chat = {
            row["chat_id"]:
                row["max_delivered"] or 0
            for row in delivery_rows
        }

        data = []

        for participant in page_participants:

            chat = participant.chat

            community = chat.community

            if not community:
                continue

            last_msg = message_map.get(
                participant.latest_message_id
            )

            if not last_msg:
                continue

            mentioned = (
                last_msg.id
                in mentioned_message_ids
                or
                getattr(
                    last_msg,
                    "mention_all",
                    False,
                )
            )

            mute = mute_map.get(
                community.id
            )

            is_muted = False

            if mute and mute.is_active:

                if (
                    mute.muted_until is None
                    or mute.muted_until > now
                ):
                    is_muted = True

            if community.cover_image_asset:

                community_cover = (
                    community
                    .cover_image_asset
                    .original_url
                )

            else:

                community_cover = (
                    community.cover_image
                )

            message_status = None

            if last_msg.sender_id == user.id:

                last_seen = (
                    other_seen_by_chat.get(
                        chat.id,
                        0,
                    )
                )

                if (
                    last_seen
                    and last_seen >= last_msg.id
                ):

                    message_status = "seen"

                elif (
                    delivered_by_chat.get(
                        chat.id,
                        0,
                    )
                    >= last_msg.id
                ):

                    message_status = "delivered"

                else:

                    message_status = "sent"

            sender = last_msg.sender

            data.append({

                "community_id":
                    community.id,

                "chat_type":
                    "community",

                "chat_id":
                    chat.id,

                "community_name":
                    community.name,

                "community_cover":
                    community_cover,

                "username":
                    (
                        sender.username
                        if sender
                        else None
                    ),

                "avatar":
                    (
                        get_user_avatar(sender)
                        if sender
                        else None
                    ),

                "text":
                    get_message_text(
                        last_msg,
                        community=True,
                    ),

                "reply_to":
                    serialize_reply_snapshot(
                        last_msg
                    ),

                "status":
                    message_status,

                # COMMUNITY ONLY
                "mentioned":
                    mentioned,

                "created_at":
                    last_msg.created_at,

                "client_created_at":
                    last_msg.client_created_at,

                "display_created_at":
                    (
                        last_msg.client_created_at
                        if (
                            last_msg.sender_id == user.id
                            and
                            last_msg.client_created_at
                        )
                        else
                        last_msg.created_at
                    ),

                "last_sender_id":
                    (
                        last_msg.sender_id
                        if sender
                        else None
                    ),

                "media_type":
                    last_msg.media_type,

                "unseen":
                    unseen_counts.get(
                        chat.id,
                        0,
                    ),

                "pinned":
                    participant.pinned,

                "pinned_at":
                    participant.pinned_at,

                "is_muted":
                    is_muted,
            })

        return Response({

            "results":
                data,

            "has_next":
                page_obj.has_next(),

            "next_page":
                (
                    page + 1
                    if page_obj.has_next()
                    else None
                ),

            "pinned_count":
                ChatParticipant.objects.filter(
                    user=user,
                    chat__chat_type="community",
                    pinned=True,
                ).count(),
        })