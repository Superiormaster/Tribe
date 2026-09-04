# notifications/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from .models import Notification, UserNotificationPreference
from post.models import Post
from users.models import User
from communities.models import Community
from .serializers import (
    NotificationSerializer,
    UserNotificationPreferenceSerializer
)

from notifications.tasks import flush_user_push_deliveries

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page = int(request.GET.get("page", 1))

        notifications = Notification.objects.filter(
            recipient=request.user
        ).order_by("-created_at")

        unread_count = notifications.filter(
            read=False
        ).count()

        paginator = Paginator(notifications, 10)

        page_obj = paginator.get_page(page)

        serializer = NotificationSerializer(
            page_obj,
            many=True
        )

        return Response({
            "results": serializer.data,
            "has_next": page_obj.has_next(),
            "unread_count": unread_count,
        })

class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            read=False,
        ).count()

        return Response({
            "count": count
        })

class NotificationPreferenceView(
    generics.RetrieveUpdateAPIView
):

    serializer_class = (
        UserNotificationPreferenceSerializer
    )

    permission_classes = [
        IsAuthenticated
    ]


    def get_object(self):

        preferences, _ = (
            UserNotificationPreference.objects
            .get_or_create(
                user=self.request.user
            )
        )

        return preferences

class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(
            Notification,
            pk=pk,
            recipient=request.user,
        )

        notification.read = True
        notification.save(
            update_fields=["read"]
        )

        return Response({
            "success": True
        })


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response({"success": True})

class FlushPushDeliveriesView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        user_id = request.user.id

        flush_user_push_deliveries.delay(
            user_id
        )

        return Response({
            "ok": True,
            "user_id": user_id,
        })