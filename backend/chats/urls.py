from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ChatViewSet,
    MessageViewSet,
    chat_detail,
    mark_seen,
    mark_delivered,
    mark_all_delivered,
    react_message,
    livekit_token,
    get_or_create_chat,
    create_call,
    end_call,
    CommunityModerationViewSet,
    VoiceRoomViewSet,
    CommunityEventViewSet,
    AnnouncementChannelViewSet,
    AnnouncementPostViewSet,
    MessageThreadViewSet,
    block_messages,
    message_before,
    message_after,
    message_window,
    unblock_messages,
    hide_all_messages,
)

router = DefaultRouter()
router.register(r"", ChatViewSet, basename="chats")
router.register(
    r"moderation",
    CommunityModerationViewSet,
    basename="moderation"
)

router.register(
    r"voice-rooms",
    VoiceRoomViewSet,
    basename="voice-rooms"
)

router.register(
    r"events",
    CommunityEventViewSet,
    basename="events"
)

router.register(
    r"announcement-channels",
    AnnouncementChannelViewSet,
    basename="announcement-channels"
)

router.register(
    r"announcement-posts",
    AnnouncementPostViewSet,
    basename="announcement-posts"
)

router.register(
    r"threads",
    MessageThreadViewSet,
    basename="threads"
)

urlpatterns = [
    path("chats/<int:chat_id>/messages/", MessageViewSet.as_view({
        "get": "list",
        "post": "create"
    })),
    path(
        "chats/<int:chat_id>/messages/hide/",
        MessageViewSet.as_view({
            "post": "hide_messages",
        }),
    ),
    path(
        "chats/<int:chat_id>/messages/delete/",
        MessageViewSet.as_view({
            "post": "delete_messages",
        }),
    ),
    path(
        "<int:chat_id>/messages/before/",
        message_before,
    ),
    path(
        "<int:chat_id>/messages/after/",
        message_after,
    ),
    path(
        "<int:chat_id>/messages/window/",
        message_window,
    ),
    path("<int:chat_id>/detail/", chat_detail),
    path("mark-seen/", mark_seen),
    path("mark-delivered/", mark_delivered),
    path("mark-all-delivered/", mark_all_delivered),
    path(
        "<int:chat_id>/hide-all/",
        hide_all_messages
    ),
    path("messages/<int:message_id>/react/", react_message),
    path("get-or-create/", get_or_create_chat),
    path(
        "message-block/<int:user_id>/",
        block_messages
    ),
    
    path(
        "message-unblock/<int:user_id>/",
        unblock_messages
    ),

    # LIVEKIT
    path("livekit/token/", livekit_token),

    # CALLS
    path("calls/create/", create_call),
    path("calls/<int:call_id>/end/", end_call),

    path("", include(router.urls)),
]