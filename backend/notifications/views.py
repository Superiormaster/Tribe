# notifications/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from .models import Notification
from post.models import Post
from users.models import User
from .serializers import NotificationSerializer

def create_star_notification(user: User, post_id: int):
    post = Post.objects.get(id=post_id)
    Notification.objects.create(
        recipient=post.user,
        sender=request.user,
        notification_type="star",
        message=f"{request.user.username} starred your post"
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


class CreateLikeNotification(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        post = Post.objects.get(id=post_id)
        recipient = post.user

        # Check if a notification already exists for this type and recipient
        notification, created = Notification.objects.get_or_create(
            recipient=recipient,
            type="like",
            post=post,
            read=False
        )

        # Add actor to the notification
        notification.actors.add(request.user)
        notification.save()

        serializer = NotificationSerializer(notification)
        return Response(serializer.data)


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
