from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ChatViewSet,
    MessageViewSet,
    chat_detail,
    mark_seen,
    mark_community_seen,
    mark_delivered,
    mark_all_delivered,
    react_message,
    retrieve_community_chat,
    livekit_token,
    report,
    unmute_chat,
    mute_chat,
    delete_chats,
    delete_chat,
    delete_community_chat,
    delete_community_chats,
    archive_chat,
    archive_community_chat,
    archive_community_chats,
    get_or_create_chat,
    create_call,
    pin_chat,
    pin_community_chat,
    pin_community_message,
    unpin_community_message,
    end_call,
    mark_community_delivered,
    VoiceRoomViewSet,
    CommunityEventViewSet,
    AnnouncementChannelViewSet,
    AnnouncementPostViewSet,
    block_messages,
    message_before,
    message_after,
    message_window,
    unblock_messages,
    hide_community_messages,
    delete_community_messages,
    hide_all_community_messages,
    delete_messages,
    hide_messages,
    hide_all_messages,
    CommunityMessageViewSet,
    community_message_after,
    community_message_before,
    community_message_window,
    community_detail,
)

router = DefaultRouter()
router.register(r"", ChatViewSet, basename="chats")

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

urlpatterns = [
    # PRIVATE CHAT
    path("chats/<int:chat_id>/messages/", MessageViewSet.as_view({
        "get": "list",
        "post": "create"
    })),
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
    path(
        "message-block/<int:user_id>/",
        block_messages
    ),
    
    path(
        "message-unblock/<int:user_id>/",
        unblock_messages
    ),
    path(
        "<int:chat_id>/hide-all/",
        hide_all_messages
    ),
    path(
        "hide/",
        hide_messages
    ),
    path(
        "delete/",
        delete_messages
    ),
    path(
        "<int:chat_id>/mute/",
        mute_chat
    ),
    path(
        "<int:chat_id>/unmute/",
        unmute_chat
    ),
    path(
        "<int:chat_id>/delete-chat/",
        delete_chat
    ),
    path(
        "delete-chats/",
        delete_chats
    ),
    path(
        "<int:chat_id>/pin/",
        pin_chat
    ),
    path(
        "<int:chat_id>/archive/",
        archive_chat
    ),
  
    # COMMUNITY CHAT
    path("chats/<int:community_id>/community-messages/", CommunityMessageViewSet.as_view({
        "get": "list",
        "post": "create"
    })),
    path(
        "<int:community_id>/community-messages/before/",
        community_message_before,
    ),
    path(
        "<int:community_id>/community-messages/after/",
        community_message_after,
    ),
    path(
        "<int:community_id>/community-messages/window/",
        community_message_window,
    ),
    path("communities/<int:community_id>/community-detail/", community_detail),
    path(
        "<int:community_id>/community-hide-all/",
        hide_all_community_messages
    ),
    path(
        "community-hide/",
        hide_community_messages
    ),
    path(
        "community-delete-messages/",
        delete_community_messages
    ),
    path(
        "<int:chat_id>/community-chat-delete/",
        delete_community_chat
    ),
    path(
        "community-chats-delete/",
        delete_community_chats
    ),
    path(
        "<int:chat_id>/community-achive/",
        archive_community_chat
    ),
    path(
        "community-archive-all/",
        archive_community_chats
    ),
    path(
        "<int:chat_id>/community-pin/",
        pin_community_chat
    ),
    path(
        "<int:message_id>/community-message-unpin/",
        unpin_community_message
    ),
    path(
        "<int:message_id>/community-message-pin/",
        pin_community_message
    ),
  
    # BASE ROUTES
    path("mark-seen/", mark_seen),
    path("communities/mark-community-seen/", mark_community_seen),
    path("mark-delivered/", mark_delivered),
    path("mark-all-delivered/", mark_all_delivered),
    path(
      "communities/mark-community-delivered/",
      mark_community_delivered,
    ),
    path("messages/<int:message_id>/react/", react_message),
    path("get-or-create/", get_or_create_chat),
    path("<int:chat_id>/retrieve-community-chat/", retrieve_community_chat),
    path("messages/<int:pk>/report/", report, name="report-message"),

    # LIVEKIT
    path("livekit/token/", livekit_token),

    # CALLS
    path("calls/create/", create_call),
    path("calls/<int:call_id>/end/", end_call),

    path("", include(router.urls)),
]