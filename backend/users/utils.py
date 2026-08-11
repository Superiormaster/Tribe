import json
from django.conf import settings
import redis
from .models import ConnectionRequest, UserInterest

def can_chat(user1, user2):
    return ConnectionRequest.objects.filter(
        from_user=user1,
        to_user=user2,
        status="accepted"
    ).exists() or ConnectionRequest.objects.filter(
        from_user=user2,
        to_user=user1,
        status="accepted"
    ).exists()

def get_interest_map(user):

    return {
        x.topic.lower(): x.score
        for x in UserInterest.objects.filter(user=user)
    }

redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True
)

def get_single_url(value):
    if not value:
        return None

    if isinstance(value, list):
        return value[0] if value else None

    if isinstance(value, str):
        value = value.strip()

        if value.startswith("[") and value.endswith("]"):
            try:
                parsed = ast.literal_eval(value)

                if isinstance(parsed, list):
                    return parsed[0] if parsed else None

            except (ValueError, SyntaxError):
                pass

        return value

    return None

def get_user_avatar(user):
    if not user:
        return None

    if user.avatar_asset:
        return get_single_url(
            user.avatar_asset.original_url
        )

    return get_single_url(user.avatar)

def get_user_cover(user):
    if not user:
        return None

    if user.cover_asset:
        return get_single_url(
            user.cover_asset.original_url
        )

    return get_single_url(user.cover_photo)

# avatar = get_user_avatar(user)

# from .utils import get_user_avatar, get_user_cover

# cover = get_user_cover(user)