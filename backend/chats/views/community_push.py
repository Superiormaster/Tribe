# chats/views/community_push.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from chats.models import Message, ChatParticipant
from chats.serializers import CommunityMessageSerializer
from notifications.models import DevicePushToken
from notifications.services.delivery import (
    schedule_message_push,
)


class CommunityMessagePushView(APIView):

    def post(self, request, message_id):

        recipient_ids = request.data.get(
            "recipient_ids",
            []
        )

        if not isinstance(
            recipient_ids,
            list
        ):
            return Response(
                {
                    "error":
                        "recipient_ids must be a list."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            message = (
                Message.objects
                .select_related(
                    "sender",
                    "chat",
                    "community",
                    "community__cover_image_asset",
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

        if (
            message.sender_id
            != request.user.id
        ):

            return Response(
                {
                    "error":
                        "You cannot push this message."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
  
        if (
            not message.community
            or message.chat.chat_type
            != "community"
        ):

            return Response(
                {
                    "error":
                        "This is not a community message."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        recipient_ids = [
            int(user_id)
            for user_id in recipient_ids
            if str(user_id).isdigit()
            and int(user_id)
            != message.sender_id
        ]

        if not recipient_ids:

            return Response(
                {
                    "queued": 0,
                    "message_id": message.id,
                }
            )

        member_ids = set(
            ChatParticipant.objects
            .filter(
                chat=message.chat,
                user_id__in=recipient_ids,
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )

        recipient_ids = [
            user_id
            for user_id in recipient_ids
            if user_id in member_ids
        ]

        if not recipient_ids:

            return Response(
                {
                    "queued": 0,
                    "message_id": message.id,
                }
            )

        from notifications.models import (
            DevicePushToken,
        )

        from notifications.services.delivery import (
            schedule_message_push,
        )

        queued = 0

        for recipient_id in recipient_ids:

            devices = (
                DevicePushToken.objects
                .filter(
                    user_id=recipient_id,
                    is_active=True,
                )
            )

            for device in devices:

                delivery = schedule_message_push(
                    message=message,
                    device=device,
                )

                if delivery:
                    queued += 1

        return Response(
            {
                "queued": queued,
                "message_id": message.id,
                "recipients": list(
                    recipient_ids
                ),
            },
            status=status.HTTP_200_OK,
        )