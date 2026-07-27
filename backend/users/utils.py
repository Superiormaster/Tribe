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