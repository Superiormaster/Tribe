from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ChatViewSet,
    MessageViewSet,
    chat_detail,
    mark_seen,
    react_message,
    livekit_token,
    get_or_create_chat,
    create_call,
    end_call,
)

router = DefaultRouter()
router.register(r"", ChatViewSet, basename="chats")
router.register(r"messages", MessageViewSet, basename="messages")

urlpatterns = [
    path("<int:chat_id>/", chat_detail),
    path("mark-seen/", mark_seen),
    path("messages/<int:message_id>/react/", react_message),
    path("get-or-create/", get_or_create_chat),

    # LIVEKIT
    path("livekit/token/", livekit_token),

    # CALLS
    path("calls/create/", create_call),
    path("calls/<int:call_id>/end/", end_call),

    path("", include(router.urls)),
]