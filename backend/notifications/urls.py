# notifications/urls.py
from django.urls import path
from .views import NotificationListView, MarkReadView, MarkAllReadView

urlpatterns = [
    path("", NotificationListView.as_view()),
    path("<int:pk>/read/", MarkReadView.as_view()),
    path("read-all/", MarkAllReadView.as_view()),
]