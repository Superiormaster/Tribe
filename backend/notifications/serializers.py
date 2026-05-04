# notifications/serializers.py
from rest_framework import serializers
from .models import Notification
from users.serializers import UserSerializer

class NotificationSerializer(serializers.ModelSerializer):
    actors = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "type", "message", "post", "actors", "read", "created_at"]

    def get_actors(self, obj):
        actors = obj.actors.all()[:3]  # show up to 3 users
        return [{"id": u.id, "username": u.username, "avatar": u.avatar if u.avatar else None} for u in actors]

    def get_message(self, obj):
        actors = [u.username for u in obj.actors.all()[:3]]
        actors_str = ", ".join(actors)
        if obj.type == "like":
            return f"{actors_str} liked your post"
        if obj.type == "comment":
            return f"{actors_str} commented on your post"
        if obj.type == "follow":
            return f"{actors_str} started following you"
        if obj.type == "share":
            return f"{actors_str} shared your post"
        if obj.type == "repost":
            return f"{actors_str} reposted your post"
        return obj.type.capitalize()