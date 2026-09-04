from django.db.models import Q

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from chats.models import (
    Chat,
    ChatReadState,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_message_count(request):
    """
    Return total unread received messages across
    private and community chats.

    Unread means:

    - Message belongs to a chat the user participates in
    - Message was not sent by the current user
    - Message is newer than the user's last seen message
    - Message is not deleted
    - Community messages are not admin-deleted

    Delivered but unseen messages are still unread.

    This endpoint never modifies read state.
    """

    user = request.user

    chats = (
        Chat.objects
        .filter(
            participants__user=user,
        )
        .values(
            "id",
        )
    )

    read_states = (
        ChatReadState.objects
        .filter(
            user=user,
        )
        .values(
            "chat_id",
            "last_seen_message_id",
        )
    )

    last_seen_by_chat = {
        state["chat_id"]:
            state["last_seen_message_id"] or 0
        for state in read_states
    }

    total_unread = 0

    chat_ids = [
        chat["id"]
        for chat in chats
    ]

    for chat_id in chat_ids:

        last_seen_id = (
            last_seen_by_chat.get(
                chat_id,
                0,
            )
        )

        chat = Chat.objects.get(
            id=chat_id,
        )

        messages = (
            chat.messages
            .filter(
                id__gt=last_seen_id,
                is_deleted=False,
            )
            .exclude(
                sender=user,
            )
        )

        if chat.chat_type == "community":
            messages = messages.filter(
                deleted_by_admin=False,
            )

        total_unread += messages.count()

    return Response({
        "count": total_unread,
    })