# notifications/services/grouping.py

from datetime import timedelta

from django.utils.timezone import now

from notifications.models import Notification
import uuid

GROUPABLE_TYPES = {
    "like",
    "comment_like",
    "comment",
    "reply",
    "share",
    "repost",
    "community",
}

def is_groupable(
    notification_type,
):
    return notification_type in GROUPABLE_TYPES


def build_group_key(
    *,
    notification_type,
    recipient,
    post=None,
    community=None,
    tribe_request=None,
):
    """
    Determines which notifications should be merged together.
    """

    if not is_groupable(notification_type):

        return (
            f"{notification_type}:"
            f"unique:{uuid.uuid4()}"
        )

    if post:
        return (
            f"{notification_type}:"
            f"post:{post.id}"
        )

    if community:
        return (
            f"{notification_type}:"
            f"community:{community.id}"
        )

    if tribe_request:
        return (
            f"{notification_type}:"
            f"tribe_request:{tribe_request.id}"
        )

    return (
        f"{notification_type}:"
        f"user:{recipient.id}"
    )


def find_grouped_notification(
    *,
    recipient,
    group_key,
    merge_window_hours=6,
):
    """
    Find an existing notification that can still
    receive additional actors.
    """

    window = (
        now()
        - timedelta(
            hours=merge_window_hours
        )
    )

    return (
        Notification.objects
        .filter(
            recipient=recipient,
            group_key=group_key,
            updated_at__gte=window,
        )
        .order_by("-updated_at")
        .first()
    )


def add_actors_to_notification(
    notification,
    actors,
):
    """
    Add only actors that are not already present.
    """

    existing_ids = set(
        notification.actors.values_list(
            "id",
            flat=True,
        )
    )

    new_actors = [
        actor
        for actor in actors
        if actor.id not in existing_ids
    ]

    if not new_actors:
        return False

    notification.actors.add(
        *new_actors
    )

    notification.count += len(
        new_actors
    )

    notification.save(
        update_fields=[
            "count",
            "updated_at",
        ]
    )

    return True