# notifications/push.py

import requests
from django.conf import settings


def push_notification(
    token,
    recipient_id,
    notification
):
    try:
        requests.post(
            f"{settings.NODE_URL}/push/notification",
            json={
                "token": token,
                "recipientId": recipient_id,
                "notification": notification,
            },
            timeout=5,
        )
    except Exception as e:
        print(
            "Push failed:",
            e
        )