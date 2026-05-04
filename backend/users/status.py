from .utils import redis_client
from django.utils import timezone
from datetime import datetime

def set_user_online(user_id):
    redis_client.set(f"user:{user_id}:status", "online", ex=30)

def set_user_offline(user_id):
    redis_client.set(f"user:{user_id}:status", "offline")
    redis_client.set(f"user:{user_id}:last_seen", timezone.now().isoformat())

def format_last_seen(timestamp_str):
    if not timestamp_str:
        return "recently"

    try:
        last_seen = datetime.fromisoformat(timestamp_str)
    except:
        return "recently"

    now = timezone.now()
    diff = now - last_seen

    seconds = diff.total_seconds()

    if seconds < 60:
        return "just now"

    minutes = seconds / 60
    if minutes < 60:
        return f"{int(minutes)} minutes ago"

    hours = minutes / 60
    if hours < 24:
        return f"{int(hours)} hr ago"

    days = hours / 24
    if days < 2:
        return "yesterday"

    return f"{int(days)} days ago"

def get_user_status(user_id):
    status = redis_client.get(f"user:{user_id}:status")

    if status == "online":
        return {"status": "online"}

    last_seen = redis_client.get(f"user:{user_id}:last_seen")

    return {
        "status": "offline",
        "last_seen": format_last_seen(last_seen)
    }