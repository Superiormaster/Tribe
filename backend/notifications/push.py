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
    notification,
):

    node_url = getattr(
        settings,
        "NODE_URL",
        None,
    )

    print(
        "🌐 [PUSH] NODE_URL:",
        node_url,
    )

    if not node_url:
        print(
            "❌ [PUSH] NODE_URL is not configured."
        )
        return

    endpoint = (
        f"{node_url}/push/notification"
    )

    try:
        response = requests.post(
            endpoint,
            json={
                "token": token,
                "notification": notification,
            },
            timeout=10,
        )

    except requests.RequestException as exc:

        print(
            "❌ [PUSH] Node request failed:",
            str(exc),
        )

        raise PushDeliveryError(
            str(exc)
        ) from exc

    try:
        data = response.json()

    except ValueError:
        data = {}

    if response.status_code == 404:

        print(
            "❌ [PUSH] Invalid FCM token"
        )

        raise InvalidPushTokenError(
            data.get(
                "error",
                "Invalid FCM token",
            )
        )

    if response.status_code >= 400:

        print(
            "❌ [PUSH] Node returned HTTP error:",
            response.status_code,
        )

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

    node_url = getattr(
        settings,
        "NODE_URL",
        None,
    )

    print(
        "🌐 [CHAT PUSH] NODE_URL:",
        node_url,
    )

    if not node_url:
        print(
            "❌ [CHAT PUSH] NODE_URL is not configured."
        )

        raise PushDeliveryError(
            "NODE_URL is not configured."
        )

    endpoint = (
        f"{node_url}/push/chat"
    )

    try:

        response = requests.post(
            endpoint,
            json={
                "token": token,
                "notification": notification,
            },
            timeout=10,
        )

    except requests.RequestException as exc:

        print(
            "❌ [CHAT PUSH] Node request failed:",
            str(exc),
        )

        raise PushDeliveryError(
            str(exc)
        ) from exc

    try:

        data = response.json()

    except ValueError:

        data = {}

    if response.status_code == 404:

        print(
            "❌ [CHAT PUSH] Invalid FCM token"
        )

        raise InvalidPushTokenError(
            data.get(
                "error",
                "Invalid FCM token",
            )
        )

    if response.status_code >= 400:

        print(
            "❌ [CHAT PUSH] Node returned HTTP error:",
            response.status_code,
        )

        raise PushDeliveryError(
            data.get(
                "error",
                response.text,
            )
        )

    return data
