from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def broadcast_post_stats(post):
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f"post_{post.id}",
        {
            "type": "post_stats",
            "post_id": post.id,
            "likes_count": post.likes.count(),
            "comments_count": post.comments.filter(
                is_deleted=False
            ).count(),
            "shares_count": post.shares.count(),
            "views_count": post.views_count,
        }
    )