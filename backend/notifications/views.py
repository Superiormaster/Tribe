# notifications/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from .models import Notification, NotificationSettings
from post.models import Post
from users.models import User
from communities.models import Community
from .serializers import (
    NotificationSerializer,
    NotificationSettingsSerializer
)

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page = int(request.GET.get("page", 1))
        notifications = Notification.objects.filter(
            recipient=request.user
        ).order_by("-created_at")

        paginator = Paginator(notifications, 10)
        page_obj = paginator.get_page(page)

        serializer = NotificationSerializer(page_obj, many=True)

        return Response({
            "results": serializer.data,
            "has_next": page_obj.has_next()
        })

class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notif = Notification.objects.get(pk=pk, recipient=request.user)
        notif.read = True
        notif.save()
        return Response({"success": True})


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response({"success": True})

class NotificationSettingsMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings, _ = (
            NotificationSettings.objects.get_or_create(
                user=request.user
            )
        )

        return Response(
            NotificationSettingsSerializer(
                settings
            ).data
        )

    def patch(self, request):
        settings, _ = (
            NotificationSettings.objects.get_or_create(
                user=request.user
            )
        )

        serializer = (
            NotificationSettingsSerializer(
                settings,
                data=request.data,
                partial=True
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(serializer.data)
