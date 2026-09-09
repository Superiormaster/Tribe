# notifications/tasks.py

from django.utils import timezone
from django.db import transaction
from celery import shared_task

@shared_task(
    bind=True,
    max_retries=5,
)
def send_push_notification(
    self,
    notification_id,
):
    from notifications.models import (
        Notification,
        DevicePushToken,
        PushNotificationDelivery,
    )

    from notifications.services.recommendation_push import (
        build_recommendation_payload,
    )

    from notifications.serializers import (
        NotificationSerializer,
    )

    from notifications.push import (
        send_to_device,
        InvalidPushTokenError,
    )

    from notifications.services.preferences import (
        can_send_push,
    )

    from users.utils import get_user_avatar

    try:

        notification = (
            Notification.objects
            .select_related(
                "recipient",
                "post",
                "community",
            )
            .prefetch_related("actors")
            .get(
                id=notification_id
            )
        )

    except Notification.DoesNotExist:

        print(
            "❌ Notification does not exist:",
            notification_id,
        )

        return

    user = notification.recipient

    if not can_send_push(
        user,
        notification.type,
    ):

        print(
            "🚫 Push blocked by user preferences"
        )

        return

    now = timezone.now()

    deliveries = (
        PushNotificationDelivery.objects
        .select_related("device")
        .filter(
            notification=notification,
            status="queued",
            scheduled_for__lte=now,
            device__user=user,
            device__is_active=True,
        )
    )

    print(
        "📦 Queued deliveries:",
        deliveries.count(),
    )

    serialized = NotificationSerializer(
        notification
    ).data

    actor = notification.actors.first()

    community_cover = ""

    if notification.community:

        community = notification.community

        if community.cover_image_asset:

            community_cover = (
                community
                .cover_image_asset
                .original_url
            )

        else:

            community_cover = (
                community.cover_image or ""
            )

    if notification.type == "recommendation":

        payload = build_recommendation_payload(
            notification=notification,
            actor=actor,
        )

    else:

        payload = {
            "id": str(notification.id),

            "type": notification.type,

            "title": "Tribe",

            "body": serialized["message"],

            "postId": (
                str(notification.post.id)
                if notification.post
                else ""
            ),

            "userId": (
                str(actor.id)
                if actor
                else ""
            ),

            "avatar": (
                get_user_avatar(actor)
                if actor
                else ""
            ),

            "thumbnail": "",

            "recommendationType": "",

            "communityCover":
                community_cover,

            "communityId": (
                str(notification.community.id)
                if notification.community
                else ""
            ),

            "createdAt":
                notification.created_at.isoformat(),

            "link": (
                f"/main/home/{notification.post.id}"
                if notification.post
                else (
                    f"/main/community/{notification.community.id}"
                    if notification.community
                    else "/main/notifications"
                )
            ),
        }

    if notification.post:

        media = (
            notification.post.media_files
            .filter(
                media_type="video"
            )
            .first()
        )

        if not media:

            media = (
                notification.post.media_files
                .filter(
                    media_type="image"
                )
                .first()
            )

        if media:

            if media.asset:

                payload["thumbnail"] = (
                    media.asset.thumbnail_url
                    or media.asset.original_url
                    or ""
                )

            else:

                payload["thumbnail"] = (
                    media.thumbnail
                    or media.file
                    or ""
                )

    for delivery in deliveries:

        if delivery.status == "sent":

            continue

        device = delivery.device

        try:

            delivery.status = "processing"
            delivery.attempts += 1

            delivery.save(
                update_fields=[
                    "status",
                    "attempts",
                ]
            )

            print(
                "🚀 Sending notification to device..."
            )

            send_to_device(
                token=device.token,
                notification=payload,
            )

            delivery.status = "sent"
            delivery.sent_at = timezone.now()
            delivery.last_error = ""

            delivery.save(
                update_fields=[
                    "status",
                    "sent_at",
                    "last_error",
                ]
            )

        except InvalidPushTokenError as exc:

            print(
                "❌ INVALID PUSH TOKEN:",
                device.id,
            )

            device.is_active = False

            device.save(
                update_fields=[
                    "is_active",
                ]
            )

            delivery.status = "invalid_token"
            delivery.last_error = str(exc)

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

        except Exception as exc:

            print(
                "Error:",
                str(exc),
            )

            delivery.status = "failed"
            delivery.last_error = str(exc)

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

            continue

@shared_task(
    bind=True,
    max_retries=5,
)
def send_message_push(
    self,
    delivery_id,
):
    from notifications.models import (
        PushNotificationDelivery,
    )

    from notifications.services.chat_push import (
        build_private_chat_payload,
        build_community_chat_payload,
    )

    from notifications.push import (
        send_chat_to_device,
        InvalidPushTokenError,
    )

    from notifications.services.preferences import (
        can_send_message_push,
        can_send_community_chat_push,
        get_quiet_hours_end,
    )

    from chats.models import ChatParticipant

    with transaction.atomic():

        try:

            delivery = (
                PushNotificationDelivery.objects
                .select_for_update()
                .select_related(
                    "message",
                    "message__sender",
                    "message__chat",
                    "message__community",
                    "device",
                    "device__user",
                )
                .prefetch_related(
                    "message__media_assets",
                )
                .get(
                    id=delivery_id
                )
            )

        except PushNotificationDelivery.DoesNotExist:

            print(
                "❌ Delivery does not exist:",
                delivery_id,
            )

            return

        if delivery.status != "queued":

            print(
                "⏭️ Delivery is not queued. Skipping."
            )

            return

        message = delivery.message
        device = delivery.device

        if not message:

            print(
                "❌ Message no longer exists."
            )

            delivery.status = "skipped"
            delivery.last_error = (
                "Message no longer exists."
            )

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

            return

        if not device.is_active:

            print(
                "⏭️ Device inactive. Skipping."
            )

            delivery.status = "skipped"
            delivery.last_error = (
                "Device is inactive."
            )

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

            return

        if message.sender_id == device.user_id:

            delivery.status = "skipped"
            delivery.last_error = (
                "Sender does not receive push."
            )

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

            return

        is_member = (
            ChatParticipant.objects
            .filter(
                chat_id=message.chat_id,
                user_id=device.user_id,
            )
            .exists()
        )

        if not is_member:

            delivery.status = "skipped"
            delivery.last_error = (
                "Recipient is no longer a chat member."
            )

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

            return

        user = device.user

        if not can_send_message_push(user):

            delivery.status = "skipped"
            delivery.last_error = (
                "Message notifications disabled."
            )

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

            return

        print(
            "✅ Private message notifications enabled."
        )

        if message.chat.chat_type == "community":

            if not can_send_community_chat_push(
                user
            ):

                delivery.status = "skipped"
                delivery.last_error = (
                    "Community notifications disabled."
                )

                delivery.save(
                    update_fields=[
                        "status",
                        "last_error",
                    ]
                )

                return

        quiet_until = get_quiet_hours_end(
            user
        )

        print(
            "Quiet until:",
            quiet_until,
        )

        if quiet_until:

            if (
                not delivery.scheduled_for
                or delivery.scheduled_for
                < quiet_until
            ):

                delivery.scheduled_for = (
                    quiet_until
                )

                delivery.save(
                    update_fields=[
                        "scheduled_for",
                    ]
                )

            return

        now = timezone.now()

        if (
            delivery.scheduled_for
            and delivery.scheduled_for > now
        ):

            return

        delivery.status = "processing"
        delivery.attempts += 1

        delivery.save(
            update_fields=[
                "status",
                "attempts",
            ]
        )

    try:

        if message.chat.chat_type == "private":

            print(
                "💬 Building PRIVATE chat payload."
            )

            payload = build_private_chat_payload(
                message=message,
                recipient=device.user,
            )

        elif message.chat.chat_type == "community":

            payload = build_community_chat_payload(
                message=message,
                recipient=device.user,
            )

        else:

            print(
                "❌ Unsupported chat type:",
                message.chat.chat_type,
            )

            with transaction.atomic():

                delivery = (
                    PushNotificationDelivery.objects
                    .select_for_update()
                    .get(
                        id=delivery_id
                    )
                )

                delivery.status = "skipped"
                delivery.last_error = (
                    "Unsupported chat type."
                )

                delivery.save(
                    update_fields=[
                        "status",
                        "last_error",
                    ]
                )

            return

        send_chat_to_device(
            token=device.token,
            notification=payload,
        )

    except InvalidPushTokenError as exc:

        print(
            "❌ INVALID FCM TOKEN"
        )

        print(
            "Error:",
            str(exc),
        )

        device.is_active = False

        device.save(
            update_fields=[
                "is_active",
            ]
        )

        with transaction.atomic():

            delivery = (
                PushNotificationDelivery.objects
                .select_for_update()
                .get(
                    id=delivery_id
                )
            )

            delivery.status = "invalid_token"
            delivery.last_error = str(exc)

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

        return

    except Exception as exc:

        print(
            "Error:",
            str(exc),
        )

        with transaction.atomic():

            delivery = (
                PushNotificationDelivery.objects
                .select_for_update()
                .get(
                    id=delivery_id
                )
            )

            delivery.status = "queued"
            delivery.last_error = str(exc)

            delivery.save(
                update_fields=[
                    "status",
                    "last_error",
                ]
            )

        raise self.retry(
            exc=exc,
            countdown=60,
        )

    with transaction.atomic():

        delivery = (
            PushNotificationDelivery.objects
            .select_for_update()
            .get(
                id=delivery_id
            )
        )

        delivery.status = "sent"
        delivery.sent_at = timezone.now()
        delivery.last_error = ""

        delivery.save(
            update_fields=[
                "status",
                "sent_at",
                "last_error",
            ]
        )

@shared_task
def process_scheduled_push_notifications():

    from notifications.models import (
        PushNotificationDelivery,
    )

    now = timezone.now()

    deliveries = (
        PushNotificationDelivery.objects
        .filter(
            status="queued",
            scheduled_for__lte=now,
        )
        .values(
            "id",
            "message_id",
            "notification_id",
        )
    )

    count = deliveries.count()

    print(
        "📦 Due deliveries:",
        count,
    )

    for delivery in deliveries:

        delivery_id = delivery["id"]

        if delivery["message_id"]:

            send_message_push.delay(
                delivery_id
            )

        elif delivery["notification_id"]:

            send_push_notification.delay(
                delivery["notification_id"]
            )

@shared_task
def flush_user_push_deliveries(user_id):

    from notifications.models import (
        PushNotificationDelivery,
    )

    now = timezone.now()

    deliveries = (
        PushNotificationDelivery.objects
        .select_related(
            "device",
            "message",
            "notification",
        )
        .filter(
            device__user_id=user_id,
            device__is_active=True,
            status="queued",
            scheduled_for__lte=now,
        )
        .order_by("created_at")
    )

    for delivery in deliveries:

        if delivery.message_id:

            send_message_push.delay(
                delivery.id
            )

        elif delivery.notification_id:

            send_push_notification.delay(
                delivery.notification_id
            )