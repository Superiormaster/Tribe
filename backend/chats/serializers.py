from rest_framework import serializers
from .models import Chat, Message

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.CharField(source='sender.avatar', read_only=True)
    reactions = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "chat",
            "text",
            "media_url",
            "media_type",
            "username",
            "avatar",
            "created_at",
            "seen_by",
        ]
        read_only_fields = ['sender', 'seen_by']

    def get_reactions(self, obj):
        return list(
            obj.messagereaction_set.values("id", "user_id", "emoji")
        )

class ChatSerializer(serializers.ModelSerializer):
    members_usernames = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = '__all__'

    def get_members_usernames(self, obj):
        return list(obj.members.values_list("username", flat=True))

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if msg:
            return MessageSerializer(msg).data
        return None

    def get_username(self, obj):
        request = self.context["request"]
        user = obj.members.exclude(id=request.user.id).first()
        return user.username if user else None

    def get_avatar(self, obj):
        request = self.context["request"]
        user = obj.members.exclude(id=request.user.id).first()
        return getattr(user, "avatar", None)