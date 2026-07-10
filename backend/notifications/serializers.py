# notifications/serializers.py
from rest_framework import serializers
from .models import Notification, NotificationSettings
from users.serializers import UserSerializer
from communities.models import Community

class NotificationSerializer(serializers.ModelSerializer):
    actors = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    community = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "message",
            "post",
            "group_key",
            "count",
            "actors",
            "read",
            "created_at",
            "community"
        ]

    def get_actors(self, obj):
        actors = obj.actors.all()[:3]  # show up to 3 users
        return [{"id": u.id, "username": u.username, "avatar": u.avatar if u.avatar else None} for u in actors]

    def get_community(self, obj):

        if not obj.community:
            return None
    
        return obj.community.id

    def get_message(self, obj):
        actors = list(obj.actors.all()[:3])

        first_actor = (
            actors[0].username
            if actors else "Someone"
        )
    
        others_count = obj.count - 1

        def format_text(action, emoji=""):

            if obj.count <= 1:
                return f"{first_actor} {action} {emoji}"

            return (
                f"{first_actor} and "
                f"{others_count} others "
                f"{action} {emoji}"
            )

        # ---------------------------
        # POST BASED NOTIFICATIONS
        # ---------------------------
        if obj.type == "like":
            if obj.community:
                return format_text(f"liked your post in {obj.community.name}", "❤️")
            return format_text("liked your post", "❤️")
    
        if obj.type == "comment_like":

            if obj.community:
                return format_text(
                    f"liked your comment in {obj.community.name}",
                    "❤️"
                )
        
            return format_text(
                "liked your comment",
                "❤️"
            )

        if obj.type == "comment":
            if obj.community:
                return format_text(f"commented on your post in {obj.community.name}", "💬")
            return format_text("commented on your post", "💬")
    
        if obj.type == "reply":
            if obj.community:
                return format_text(
                    f"replied to your comment in {obj.community.name}",
                    "💬"
                )
        
            return format_text(
                "replied to your comment",
                "💬"
            )

        if obj.type == "star":
            return format_text("starred you", "⭐")

        if obj.type == "share":
            if obj.community:
                return format_text(f"shared your post in {obj.community.name}.", "🔁")
            return format_text(f"shared your post.", "🔁")
    
        if obj.type == "repost":
            if obj.community:
                return format_text(f"reposted your post in {obj.community.name}", "🔁")
            return format_text(f"reposted your post", "🔁")

        # ---------------------------
        # CONNECTION SYSTEM
        # ---------------------------
        if obj.type == "connection_request":
            return (
                f"{first_actor} "
                f"sent you a connection request 🤝"
            )
    
        if obj.type == "connection_accept":
            return (
                f"You are now connected "
                f"with {first_actor} 🤝"
            )
    
        if obj.type == "connection_declined":
            return (
                f"{first_actor} declined "
                f"your connection request"
            )

        # ---------------------------
        # COMMUNITY
        # ---------------------------
        if obj.type == "community":
            return format_text(f"interacted with your {obj.community.name} community", "🏘")

        if obj.type == "invite":
            return (
                f"{first_actor} invited you "
                f"to join {obj.community.name} 🏘"
            )

        if obj.type == "invite_accept":
            return (
                f"{first_actor} joined "
                f"{obj.community.name} 🏘"
            )

        if obj.type == "approval":
            return (
                f"Admin approved your post "
                f"in {obj.community.name}"
            )

        if obj.type == "join_request":
            return f"{first_actor} requested to join {obj.community.name}"
  
        if obj.type == "join_approved":
            return f"Your request to join {obj.community.name} was approved 🎉"
  
        if obj.type == "join_rejected":
            return f"Your request to join {obj.community.name} was rejected"
  
        if obj.type == "community_ban":
            return f"You were removed from {obj.community.name}"
  
        if obj.type == "community_unban":
            return f"You can join {obj.community.name} again"
  
        if obj.type == "moderator_added":
            return f"You were made a moderator in {obj.community.name}"
        
        if obj.type == "admin_added":
            return f"You were made an admin in {obj.community.name}"
  
        if obj.type == "role_removed":
            return f"Your staff role was removed in {obj.community.name}"
  
        if obj.type == "post_approved":
            return f"Your post was approved in {obj.community.name}"
  
        if obj.type == "post_rejected":
            return f"Your post was rejected in {obj.community.name}"

        if obj.type == "tribe_request_approved":
            tribe = (
                obj.tribe_request.name
                if obj.tribe_request
                else "your"
            )
        
            return (
                f"Your request for the "
                f"{tribe} tribe has been approved 🎉"
            )

        if obj.type == "tribe_request_rejected":
            tribe = (
                obj.tribe_request.name
                if obj.tribe_request
                else "your"
            )
        
            return (
                f"Your request for the "
                f"{tribe} tribe has been rejected."
            )
  
        return obj.type.capitalize()

class NotificationSettingsSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = NotificationSettings
        fields = "__all__"
        read_only_fields = ["user"]