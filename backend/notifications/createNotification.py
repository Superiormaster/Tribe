from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from notifications.models import (
    Notification,
    DevicePushToken,
)

from notifications.serializers import (
    NotificationSerializer,
)

from notifications.services.delivery import (
    schedule_push_notification,
)


def create_notification(
    *,
    type,
    recipient,
    actors=None,
    post=None,
    community=None,
    tribe_request=None,
    recommendation_type="",
    message="",
    group_key=None,
    merge_window_hours=6,
    push=True,
):

    actors = actors or []

    # --------------------------------
    # Don't notify yourself
    # --------------------------------

    actors = [
        actor
        for actor in actors
        if actor.id != recipient.id
    ]

    # ==================================
    # RECOMMENDATIONS ARE NEVER GROUPED
    # ==================================

    if type == "recommendation":

        notification = Notification.objects.create(
            recipient=recipient,
            type=type,
            post=post,
            community=community,
            tribe_request=tribe_request,
            recommendation_type=recommendation_type,
            group_key=None,
            count=1,
            message=message or "",
        )

        if actors:
            notification.actors.add(
                *actors
            )

    # ==================================
    # NORMAL NOTIFICATIONS
    # ==================================

    else:

        from notifications.services.grouping import (
            build_group_key,
            find_grouped_notification,
            add_actors_to_notification,
        )

        if not group_key:

            group_key = build_group_key(
                notification_type=type,
                recipient=recipient,
                post=post,
                community=community,
                tribe_request=tribe_request,
            )

        notification = (
            find_grouped_notification(
                recipient=recipient,
                group_key=group_key,
                merge_window_hours=merge_window_hours,
            )
        )

        if notification:

            changed = add_actors_to_notification(
                notification,
                actors,
            )

            if not changed:
                return notification

        else:

            notification = (
                Notification.objects.create(
                    recipient=recipient,
                    type=type,
                    post=post,
                    community=community,
                    tribe_request=tribe_request,
                    recommendation_type="",
                    group_key=group_key,
                    count=max(
                        len(actors),
                        1,
                    ),
                    message=message or "",
                )
            )

            if actors:
                notification.actors.add(
                    *actors
                )

    # ==================================
    # SERIALIZE
    # ==================================

    serialized = NotificationSerializer(
        notification
    ).data

    # ==================================
    # WEBSOCKET
    # ==================================

    channel_layer = get_channel_layer()

    async_to_sync(
        channel_layer.group_send
    )(
        f"notifications_{recipient.id}",
        {
            "type": "send_notification",
            "data": serialized,
        },
    )

    # ==================================
    # PUSH
    # ==================================

    if push:

        devices = (
            DevicePushToken.objects
            .filter(
                user=recipient,
                is_active=True,
            )
        )

        for device in devices:

            schedule_push_notification(
                notification=notification,
                device=device,
            )

    return notification