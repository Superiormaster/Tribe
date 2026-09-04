from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_post_stats(post):

    channel_layer = get_channel_layer()

    comments_count = post.comments.filter(
        is_deleted=False
    ).count()

    shares_count = post.shares.filter(
        is_deleted=False,
        status="approved"
    ).count()

    likes_count = post.likes.count()
    views_count = post.views_count

    event = {
        "type": "post_stats",
        "post_id": post.id,
        "likes_count": likes_count,
        "comments_count": comments_count,
        "shares_count": shares_count,
        "views_count": views_count,
    }

    # --------------------------------
    # 1. INDIVIDUAL POST ROOM
    # --------------------------------
    async_to_sync(channel_layer.group_send)(
        f"post_{post.id}",
        event
    )

    # --------------------------------
    # 2. GLOBAL FEED
    # --------------------------------
    async_to_sync(channel_layer.group_send)(
        "feed_global",
        event
    )

    # --------------------------------
    # 3. COMMUNITY FEED
    # --------------------------------
    if post.community_id:
        async_to_sync(channel_layer.group_send)(
            f"feed_community_{post.community_id}",
            event
        )

    # --------------------------------
    # 4. PROFILE FEED
    # --------------------------------
    async_to_sync(channel_layer.group_send)(
        f"feed_profile_{post.user_id}",
        event
    )