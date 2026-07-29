# notifications/push.py

import requests
from django.conf import settings


def push_notification(
    token,
    recipient_id,
    notification
):
    print("========== DJANGO PUSH ==========")
    node_url = getattr(settings, "NODE_URL", None)
  
    if not node_url:
      print("NODE_URL is not configured.")
      return
    try:
        response = requests.post(
            f"{node_url}/push/notification",
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