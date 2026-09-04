# notifications/push.py

import requests
from django.conf import settings

class PushDeliveryError(Exception):
    pass


class InvalidPushTokenError(
    PushDeliveryError
):
    pass

def send_to_device(
    *,
    token,
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
                "notification": notification,
            },
            timeout=10,
        )
        print("Node status:", response.status_code)
        print("Node response:", response.text)
        print("================================")

    except requests.RequestException as exc:

        raise PushDeliveryError(
            str(exc)
        ) from exc

    try:
        data = response.json()
    except ValueError:
        data = {}

    if response.status_code == 404:

        raise InvalidPushTokenError(
            data.get(
                "error",
                "Invalid FCM token"
            )
        )

    if response.status_code >= 400:

        raise PushDeliveryError(
            data.get(
                "error",
                response.text,
            )
        )

    return data

def send_chat_to_device(
    *,
    token,
    notification,
):
    print(
        "========== DJANGO CHAT PUSH =========="
    )

    node_url = getattr(
        settings,
        "NODE_URL",
        None,
    )

    if not node_url:
        raise PushDeliveryError(
            "NODE_URL is not configured."
        )

    try:

        response = requests.post(
            f"{node_url}/push/chat",
            json={
                "token": token,
                "notification": notification,
            },
            timeout=10,
        )

        print(
            "Node status:",
            response.status_code,
        )

        print(
            "Node response:",
            response.text,
        )

        print(
            "======================================"
        )

    except requests.RequestException as exc:

        raise PushDeliveryError(
            str(exc)
        ) from exc

    try:
        data = response.json()

    except ValueError:
        data = {}

    if response.status_code == 404:

        raise InvalidPushTokenError(
            data.get(
                "error",
                "Invalid FCM token",
            )
        )

    if response.status_code >= 400:

        raise PushDeliveryError(
            data.get(
                "error",
                response.text,
            )
        )

    return data