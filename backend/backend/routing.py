from django.urls import re_path
from post.consumers import CommentConsumer
from post.consumer import FeedConsumer
from notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    re_path(r"ws/comments/(?P<post_id>\d+)/$", CommentConsumer.as_asgi()),
    re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
    re_path(
        r"ws/feed/global/$",
        FeedConsumer.as_asgi(),
        name="feed-global"
    ),

    re_path(
        r"ws/feed/community/(?P<community_id>\d+)/$",
        FeedConsumer.as_asgi(),
        name="feed-community"
    ),

    re_path(
        r"ws/feed/profile/(?P<user_id>\d+)/$",
        FeedConsumer.as_asgi(),
        name="feed-profile"
    ),
]