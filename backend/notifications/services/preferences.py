from django.utils import timezone
from datetime import datetime, timedelta

from notifications.models import (
    UserNotificationPreference,
)


SOCIAL_TYPES = {
    "like",
    "comment_like",
    "comment",
    "reply",
    "star",
    "bookmark",
    "share",
    "repost",
    "connected",
    "connection_request",
    "connection_accept",
    "connection_declined",
}

COMMUNITY_TYPES = {
    "community",
    "invite",
    "invite_accept",
    "join_rejected",
    "join_approved",
    "join_request",
    "community_ban",
    "community_unban",
    "community_removed",
    "moderator_added",
    "admin_added",
    "role_removed",
    "post_approved",
    "post_rejected",
    "tribe_request_rejected",
    "tribe_request_approved",
}

def get_notification_preferences(user):
    from notifications.models import (
        UserNotificationPreference,
    )

    preferences, _ = (
        UserNotificationPreference.objects
        .get_or_create(
            user=user
        )
    )

    return preferences

def get_notification_preference_field(
    notification_type,
):

    preferences = (
        get_notification_preferences(user)
    )

    if not preferences:
        return True

    if not preferences.push_enabled:
        return False

    if notification_type in SOCIAL_TYPES:
        return (
            preferences.social_notifications
        )

    
    if notification_type == "message":
        return (
            preferences.message_notifications
        )

    if notification_type in COMMUNITY_TYPES:
        return (
            preferences.community_notifications
        )

    if notification_type == "recommendation":
        return (
            preferences
            .recommendation_notifications
        )

    if notification_type in {
        "marketing",
        "announcement",
    }:
        return (
            preferences
            .marketing_notifications
        )

    return (
        preferences.social_notifications
    )

def can_send_message_push(user):
    preferences = (
        get_notification_preferences(user)
    )

    return (
        preferences.push_enabled
        and preferences.message_notifications
    )


def can_send_community_chat_push(user):
    preferences = (
        get_notification_preferences(user)
    )

    return (
        preferences.push_enabled
        and preferences.community_notifications
    )

def get_quiet_hours_end(user):
    """
    Returns the timezone-aware datetime when quiet
    hours finish.

    Returns None if quiet hours are not currently active.
    """

    preferences = (
        get_notification_preferences(user)
    )

    if not preferences:
        return None

    if not preferences.quiet_hours_enabled:
        return None

    start = preferences.quiet_hours_start
    end = preferences.quiet_hours_end

    if not start or not end:
        return None

    local_now = timezone.localtime()

    current_time = local_now.time()

    # -----------------------------
    # Same-day quiet hours
    # Example:
    # 13:00 → 17:00
    # -----------------------------

    if start < end:

        if start <= current_time < end:

            end_datetime = local_now.replace(
                hour=end.hour,
                minute=end.minute,
                second=0,
                microsecond=0,
            )

            return end_datetime

        return None

    # -----------------------------
    # Overnight quiet hours
    # Example:
    # 22:00 → 07:00
    # -----------------------------

    if current_time >= start:

        # Ends tomorrow
        end_datetime = (
            local_now + timedelta(days=1)
        ).replace(
            hour=end.hour,
            minute=end.minute,
            second=0,
            microsecond=0,
        )

        return end_datetime

    if current_time < end:

        # Ends today
        end_datetime = local_now.replace(
            hour=end.hour,
            minute=end.minute,
            second=0,
            microsecond=0,
        )

        return end_datetime

    return None

def can_send_push(
    user,
    notification_type,
):

    preferences, _ = (
        UserNotificationPreference.objects
        .get_or_create(user=user)
    )

    if not preferences.push_enabled:
        return False
  
    if not preferences:
        return True

    field = get_notification_preference_field(
        notification_type
    )

    return getattr(
        preferences,
        field,
        True,
    )
