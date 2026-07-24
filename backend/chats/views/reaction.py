from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404

from chats.models import (
    Message,
    MessageReaction,
)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def react_message(request, message_id):
    emoji = request.data["emoji"]

    message = get_object_or_404(
        Message,
        id=message_id,
    )

    reaction = MessageReaction.objects.filter(
        message=message,
        user=request.user
    ).first()

    if reaction:

        if reaction.emoji == emoji:

            reaction.delete()

            return Response({
                "removed": True,
                "message_id": message.id,
                "user_id": request.user.id,
                "emoji": emoji,
            })

        reaction.emoji = emoji
        reaction.save()

    else:

        reaction = MessageReaction.objects.create(
            message=message,
            user=request.user,
            emoji=emoji
        )

    return Response({
        "message_id": message.id,
        "user_id": request.user.id,
        "emoji": reaction.emoji,
        "removed": False,
    })