from django.utils import timezone

from notifications.models import (
    PushNotificationDelivery,
)
from notifications.services.preferences import (
    can_send_push,
    can_send_message_push,
    get_quiet_hours_end,
)

def schedule_push_notification(
    notification,
    device,
):

    user = notification.recipient

    if not can_send_push(
        user,
        notification.type,
    ):
        return None

    delivery, created = (
        PushNotificationDelivery.objects
        .get_or_create(
            notification=notification,
            device=device,
        )
    )

    if delivery.status == "sent":
        return delivery

    quiet_until = get_quiet_hours_end(user)

    if quiet_until:

        print(
            "⏰ Quiet hours until:",
            quiet_until,
        )

        delivery.status = "queued"
        delivery.scheduled_for = quiet_until

    else:

        delivery.status = "queued"
        delivery.scheduled_for = timezone.now()

        print(
            "🚀 Notification push queued immediately"
        )

    delivery.save(
        update_fields=[
            "status",
            "scheduled_for",
        ],
    )

    print(
        "✅ Delivery saved as QUEUED:",
        delivery.id,
    )

    if not quiet_until:

        print(
            "🚀 Queuing Celery NORMAL PUSH:",
            delivery.id,
        )

        from notifications.tasks import send_push_notification

        send_push_notification.delay(
            notification.id
        )

        print(
            "✅ Celery NORMAL PUSH queued:",
            notification.id,
        )

    else:

        print(
            "⏰ Normal push waiting for quiet hours to end."
        )

    print(
        "=============================================="
    )

    return delivery

def schedule_message_push(
    *,
    message,
    device,
):

    user = device.user

    if not device.is_active:

        print(
            "🚫 Device inactive. Push NOT scheduled."
        )

        return None

    if not can_send_message_push(user):

        print(
            "🚫 User disabled message notifications."
        )

        delivery, _ = (
            PushNotificationDelivery.objects
            .get_or_create(
                message=message,
                device=device,
                defaults={
                    "status": "skipped",
                    "last_error":
                        "Message notifications disabled.",
                },
            )
        )

        if delivery.status != "sent":

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

        return delivery

    print(
        "✅ Message notifications enabled."
    )

    delivery, created = (
        PushNotificationDelivery.objects
        .get_or_create(
            message=message,
            device=device,
            defaults={
                "status": "queued",
            },
        )
    )

    if delivery.status == "sent":

        print(
            "⏭️ Already sent."
        )

        return delivery

    quiet_until = get_quiet_hours_end(user)

    if quiet_until:

        print(
            "⏰ Quiet hours until:",
            quiet_until,
        )

        delivery.status = "queued"
        delivery.scheduled_for = quiet_until

    else:

        delivery.status = "queued"
        delivery.scheduled_for = timezone.now()

        delivery.last_error = ""

        delivery.save(
            update_fields=[
                "status",
                "scheduled_for",
                "last_error",
            ],
        )
    
        print(
            "✅ MESSAGE PUSH DELIVERY QUEUED:",
            delivery.id,
        )
    
        if not quiet_until:
    
            print(
                "🚀 Queuing Celery MESSAGE PUSH:",
                delivery.id,
            )
    
            from notifications.tasks import send_message_push
    
            send_message_push.delay(
                delivery.id
            )
    
        else:
    
            print(
                "Scheduled for:",
                delivery.scheduled_for,
            )
    
        return delivery