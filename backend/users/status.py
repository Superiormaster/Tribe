from .utils import redis_client
from django.utils import timezone
from datetime import datetime

def set_user_online(user_id):
    redis_client.set(
        f"user:{user_id}:status",
        "online",
        ex=30
    )

def set_user_offline(user_id):
    redis_client.delete(f"user:{user_id}:status")

    from django.contrib.auth import get_user_model
    User = get_user_model()

    User.objects.filter(id=user_id).update(
        last_seen=timezone.now()
    )

def format_last_seen(last_seen):
    if not last_seen:
        return "recently"

    if isinstance(last_seen, str):
        try:
            last_seen = datetime.fromisoformat(last_seen)
        except:
            return "recently"

    now = timezone.now()
    diff = now - last_seen

    seconds = diff.total_seconds()

    if seconds < 60:
        return "just now"

    if seconds < 3600:
        return f"{int(seconds/60)} minutes ago"

    if seconds < 86400:
        return f"{int(seconds/3600)} hours ago"

    if seconds < 172800:
        return "yesterday"

    return last_seen.strftime("%d/%m/%Y")

def get_user_status(user_id):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    status = redis_client.get(f"user:{user_id}:status")

    user = User.objects.filter(id=user_id).first()

    if status == b"online":
        return {"status": "online"}

    return {
        "status": "offline",
        "last_seen": user.last_seen if user else None
    }