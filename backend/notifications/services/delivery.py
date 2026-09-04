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

    # -----------------------------
    # Preference
    # -----------------------------

    if not can_send_push(
        user,
        notification.type,
    ):
        return None

    delivery, _ = (
        PushNotificationDelivery.objects
        .get_or_create(
            notification=notification,
            device=device,
        )
    )

    # Already delivered
    if delivery.status == "sent":
        return delivery

    # -----------------------------
    # Quiet hours
    # -----------------------------

    quiet_until = get_quiet_hours_end(user)

    if quiet_until:
        delivery.status = "queued"
        delivery.scheduled_for = quiet_until

    else:
        delivery.status = "queued"
        delivery.scheduled_for = timezone.now()

    delivery.save(
        update_fields=[
            "status",
            "scheduled_for",
        ],
    )

    return delivery

def schedule_message_push(
    *,
    message,
    device,
):
    user = device.user

    if not device.is_active:
        return None

    if not can_send_message_push(user):

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

    # --------------------------------
    # Existing delivery
    # --------------------------------

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
        return delivery

    # --------------------------------
    # Quiet hours
    # --------------------------------

    quiet_until = get_quiet_hours_end(user)

    if quiet_until:

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

    return delivery