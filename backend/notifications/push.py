# notifications/push.py

import requests
from django.conf import settings


def push_notification(
    token,
    recipient_id,
    notification
):
    print("========== DJANGO PUSH ==========")
    print("Recipient:", recipient_id)
    print("Token exists:", bool(token))
    print("NODE_URL:", settings.NODE_URL)
    print("Notification:", notification)
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
        print("Node status:", response.status_code)
        print("Node response:", response.text)
        print("================================")
    except Exception as e:
        print(
            "Push failed:",
            e
        )