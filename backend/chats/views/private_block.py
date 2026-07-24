from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404

from django.contrib.auth import get_user_model

from chats.models import MessageBlockedUser

User = get_user_model()

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def block_messages(request, user_id):
    target = get_object_or_404(
        User,
        id=user_id,
    )

    if target == request.user:
        return Response(
            {"error": "You cannot block yourself"},
            status=400,
        )

    MessageBlockedUser.objects.get_or_create(
        user=request.user,
        blocked_user=target,
    )

    return Response({
        "success": True,
        "blocked": True,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unblock_messages(request, user_id):
    MessageBlockedUser.objects.filter(
        user=request.user,
        blocked_user_id=user_id,
    ).delete()

    return Response({
        "success": True,
        "blocked": False,
    })