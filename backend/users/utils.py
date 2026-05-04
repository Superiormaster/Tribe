import json
from django.conf import settings
import redis
from .models import ConnectionRequest

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

redis_client = redis.Redis(
    host="127.0.0.1",
    port=6379,
    db=0,
    decode_responses=True
)