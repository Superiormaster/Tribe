# feed/cache.py

import json
from users.utils import redis_client

def get_cached_feed(redis_client, user_id, tribe_id=None):
    key = f"feed:user:{user_id}:tribe:{tribe_id or 'all'}"
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)
    return None


def set_cached_feed(redis_client, user_id, post_ids, ttl=300, tribe_id=None):
    ttl = 300 if ttl is None else int(ttl)

    key = f"feed:user:{user_id}:tribe:{tribe_id or 'all'}"
    redis_client.setex(key, ttl, json.dumps(post_ids))

def get_cached_reels(redis_client, user_id, tribe_id=None):
    key = f"reels:user:{user_id}:tribe:{tribe_id or 'all'}"
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)
    return None


def set_cached_reels(redis_client, user_id, reel_ids, ttl=300, tribe_id=None):
    key = f"reels:user:{user_id}:tribe:{tribe_id or 'all'}"
    redis_client.setex(key, ttl, json.dumps(reel_ids))

def get_seen_posts(redis_client, user_id):
    key = f"feed:seen:{user_id}"
    data = redis_client.smembers(key)
    return list(map(int, data)) if data else []


def mark_seen(redis_client, user_id, post_ids):
    key = f"feed:seen:{user_id}"
    if post_ids:
        redis_client.sadd(key, *post_ids)
        redis_client.expire(key, 86400)

def invalidate_profile_cache(username):
    """
    Invalidate all cached profile stats and feed pages
    for this username, regardless of which viewer requested them.
    """

    patterns = [
        f"profile:{username}:stats:*",
        f"profile:{username}:feed:*",
    ]

    for pattern in patterns:
        for key in redis_client.scan_iter(match=pattern):
            redis_client.delete(key)