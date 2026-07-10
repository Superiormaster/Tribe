# notifications/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationListView, MarkReadView, MarkAllReadView, NotificationSettingsMeView

router = DefaultRouter()

urlpatterns = [
    path("", NotificationListView.as_view()),
    path("<int:pk>/read/", MarkReadView.as_view()),
    path("read-all/", MarkAllReadView.as_view()),
    path(
        "settings/me/",
        NotificationSettingsMeView.as_view()
    ),

    path("", include(router.urls)),
]