# notifications/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import Paginator
from .models import Notification
from post.models import Post
from users.models import User
from communities.models import Community
from .serializers import NotificationSerializer

def create_star_notification(user: User, post_id: int):
    post = Post.objects.get(id=post_id)
    Notification.objects.create(
        recipient=post.user,
        notification_type="star",
        message=f"{request.user.username} starred your post"
    )
    notif.actors.add(request.user)

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
        group_key = f"like:community:{community.id}:post:{post.id}"

        window = now() - timedelta(hours=6)

        notif = Notification.objects.filter(
            recipient=recipient,
            group_key=group_key,
            updated_at__gte=window
        ).first()

        if notif:
            notif.count += 1
            notif.actors.add(request.user)
            notif.message = f"{request.user.username} and {notif.count - 1} others liked your post ❤️"
            notif.save()

        else:
            notif = Notification.objects.create(
                recipient=recipient,
                type="like",
                post=post,
                community=community,
                group_key=group_key,
                message=f"{request.user.username} liked your post ❤️",
                count=1
            )
            notif.actors.add(request.user)

        return Response(NotificationSerializer(notif).data)


class CreateCommentNotification(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        post = Post.objects.get(id=post_id)

        recipient = post.user
        group_key = f"comment:post:{post.id}"

        window = now() - timedelta(hours=6)

        notif = Notification.objects.filter(
            recipient=recipient,
            group_key=group_key,
            updated_at__gte=window
        ).first()

        if notif:
            notif.count += 1
            notif.actors.add(request.user)
            notif.message = f"{request.user.username} and {notif.count - 1} others commented 💬"
            notif.save()

        else:
            notif = Notification.objects.create(
                recipient=recipient,
                type="comment",
                post=post,
                community=community,
                group_key=group_key,
                message=f"{request.user.username} commented 💬",
                count=1
            )
            notif.actors.add(request.user)

        return Response(NotificationSerializer(notif).data)



class CreateCommunityNotification(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, community_id):
        community = Community.objects.get(id=community_id)

        recipient = community.owner
        group_key = f"community:{community_id}"

        notif = Notification.objects.create(
            recipient=recipient,
            type="community",
            community=community,
            group_key=group_key,
            message=f"{request.user.username} interacted with your community 🏘",
            count=1
        )

        notif.actors.add(request.user)

        return Response(NotificationSerializer(notif).data)


class CreateCommunityInviteNotification(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, community_id):
        community = Community.objects.get(id=community_id)

        recipient_id = request.data.get("user_id")
        recipient = User.objects.get(id=recipient_id)

        group_key = f"invite:community:{community_id}"

        notif = Notification.objects.create(
            recipient=recipient,
            type="invite",
            group_key=group_key,
            message=f"{request.user.username} invited you to join {community.name}",
            count=1
        )

        notif.actors.add(request.user)

        return Response(NotificationSerializer(notif).data)


class CreateApprovalNotification(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        post = Post.objects.get(id=post_id)
        recipient = post.user

        group_key = f"approval:post:{post.id}"

        notif = Notification.objects.create(
            recipient=recipient,
            type="approval",
            post=post,
            group_key=group_key,
            message=f"Admin approved your post in {post.community.name}",
            count=1
        )

        notif.actors.add(request.user)

        return Response(NotificationSerializer(notif).data)


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
