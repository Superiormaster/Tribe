from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from chats.models import Message, ChatParticipant

from notifications.models import (
    DevicePushToken,
)

from notifications.services.delivery import (
    schedule_message_push,
)


class PrivateChatPushView(
    APIView
):
    permission_classes = [
        IsAuthenticated
    ]

    def post(
        self,
        request,
    ):

        message_id = request.data.get(
            "message_id"
        )

        recipient_id = request.data.get(
            "recipient_id"
        )

        if not message_id:
            return Response(
                {
                    "error":
                        "message_id is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not recipient_id:
            return Response(
                {
                    "error":
                        "recipient_id is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            message = (
                Message.objects
                .select_related(
                    "chat",
                    "sender",
                )
                .prefetch_related(
                    "media_assets",
                )
                .get(
                    id=message_id
                )
            )

        except Message.DoesNotExist:

            return Response(
                {
                    "error":
                        "Message not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if message.sender_id != request.user.id:

            return Response(
                {
                    "error":
                        "You cannot push this message."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if message.chat.chat_type != "private":

            return Response(
                {
                    "error":
                        "This is not a private chat."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
  
        recipient_is_member = (
            ChatParticipant.objects
            .filter(
                chat=message.chat,
                user_id=recipient_id,
            )
            .exists()
        )

        if not recipient_is_member:

            return Response(
                {
                    "error":
                        "Recipient is not a member of this chat."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if int(recipient_id) == request.user.id:

            return Response({
                "success": True,
                "queued": False,
            })

        devices = (
            DevicePushToken.objects
            .filter(
                user_id=recipient_id,
                is_active=True,
            )
        )

        queued = 0

        for device in devices:

            delivery = schedule_message_push(
                message=message,
                device=device,
            )

            if delivery:
                queued += 1

        return Response(
            {
                "success": True,
                "queued": queued,
                "message_id": message.id,
                "recipient_id": recipient_id,
            },
            status=status.HTTP_200_OK,
        )