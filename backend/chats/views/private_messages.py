from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from chats.serializers import PrivateMessageSerializer

from chats.utils.messages import (
    get_chat_messages,
    get_anchor_message,
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
            "messages": PrivateMessageSerializer(
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
            "messages": PrivateMessageSerializer(
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
            base.order_by("-id")[:before + after]
        )

        latest.reverse()

        return Response(
            {
                "messages": PrivateMessageSerializer(
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
            "messages": PrivateMessageSerializer(
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