# notifications/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationListView, MarkReadView, MarkAllReadView, NotificationPreferenceView, NotificationUnreadCountView, FlushPushDeliveriesView

router = DefaultRouter()

urlpatterns = [
    path("", NotificationListView.as_view()),
    path("<int:pk>/read/", MarkReadView.as_view()),
    path("read-all/", MarkAllReadView.as_view()),
    path(
        "unread-count/",
        NotificationUnreadCountView.as_view(),
        name="notification-unread-count",
    ),
    path(
        "push/flush/",
        FlushPushDeliveriesView.as_view(),
    ),
    path(
        "preferences/",
        NotificationPreferenceView.as_view(),
        name="notification-preferences",
    ),

    path("", include(router.urls)),
]