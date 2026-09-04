from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from chats.serializers import CommunityMessageSerializer

from chats.utils.messages import (
    get_community_messages,
    get_community_anchor_message,
)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def community_message_after(
    request,
    community_id,
):

    anchor = request.GET.get("anchor")

    if not anchor:
        return Response({
            "messages": [],
            "hasNewer": False,
        })

    limit = int(request.GET.get("limit", 25))

    base = get_community_messages(
        community_id,
        request.user,
    )

    newer = list(
        base.filter(id__gt=anchor)
        .order_by("id")[:limit]
    )

    has_newer = (
        base.filter(id__gt=newer[-1].id).exists()
        if newer else False
    )

    serialized = CommunityMessageSerializer(
        newer,
        many=True,
        context={"request": request},
    ).data
    
    print(
        "AFTER SERIALIZED REACTIONS:",
        [
            {
                "id": message["id"],
                "reactions": message.get("reactions"),
            }
            for message in serialized
        ]
    )
    
    return Response({
        "messages": serialized,
        "hasNewer": has_newer,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def community_message_window(
    request,
    community_id,
):

    anchor = request.GET.get("anchor")

    before = min(
        int(request.GET.get("before", 25)),
        25,
    )
    
    after = min(
        int(request.GET.get("after", 25)),
        25,
    )

    base = get_community_messages(
        community_id,
        request.user,
    )

    # First open
    if not anchor:

        latest = list(
            base.order_by("-id")[:before + after]
        )

        latest.reverse()

        serialized = CommunityMessageSerializer(
            latest,
            many=True,
            context={"request": request},
        ).data
        
        return Response({
            "messages": serialized,
            "hasOlder": (
                base.filter(id__lt=latest[0].id).exists()
                if latest else False
            ),
            "hasNewer": False,
        })

    anchor_message = get_community_anchor_message(
        community_id,
        request.user,
        anchor,
    )

    if not anchor_message:
        return Response({
            "messages": [],
            "hasOlder": False,
            "hasNewer": False,
        })

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

    return Response({
        "messages": CommunityMessageSerializer(
            messages,
            many=True,
            context={"request": request},
        ).data,
        "hasOlder": (
            base.filter(id__lt=messages[0].id).exists()
            if messages else False
        ),
        "hasNewer": (
            base.filter(id__gt=messages[-1].id).exists()
            if messages else False
        ),
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def community_message_before(
    request,
    community_id,
):

    anchor = request.GET.get("anchor")

    if not anchor:
        return Response({
            "messages": [],
            "hasOlder": False,
        })

    limit = int(request.GET.get("limit", 25))

    base = get_community_messages(
        community_id,
        request.user,
    )

    older = list(
        base.filter(id__lt=anchor)
        .order_by("-id")[:limit]
    )

    older.reverse()

    has_older = (
        base.filter(id__lt=older[0].id).exists()
        if older else False
    )
    
    serialized = CommunityMessageSerializer(
        older,
        many=True,
        context={"request": request},
    ).data
    
    print(
        "BEFORE SERIALIZED REACTIONS:",
        [
            {
                "id": message["id"],
                "reactions": message.get("reactions"),
            }
            for message in serialized
        ]
    )
    
    return Response({
        "messages": serialized,
        "hasOlder": has_older,
    })