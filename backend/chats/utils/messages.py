from chats.models import Message

def get_chat_messages(chat_id, user):
    return (
        Message.objects.filter(
            chat_id=chat_id,
            chat__participants__user=user,
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


def get_community_messages(community_id, user):
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
        )
    )

def get_community_anchor_message(
    community_id,
    user,
    anchor,
):
    if not anchor:
        return None

    return (
        get_community_messages(
            community_id,
            user,
        )
        .filter(id=anchor)
        .first()
    )