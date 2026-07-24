from rest_framework import serializers
from .models import (
    Chat,
    Message,
    MessageReaction,
    VoiceRoom,
    CommunityEvent,
    AnnouncementChannel,
    AnnouncementPost,
    ChatReadState,
    ChatParticipant,
)
from django.contrib.auth import get_user_model

User = get_user_model()


class MentionSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "avatar",
        ]

class MessageReactionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    count = serializers.SerializerMethodField()

    class Meta:
        model = MessageReaction
        fields = [
            "id",
            "emoji",
            "user",
            "username",
            "count",
        ]

    def get_count(self, obj):
        return MessageReaction.objects.filter(
            message=obj.message,
            emoji=obj.emoji,
        ).count()

class BaseReplySerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="sender.username",
        read_only=True,
    )

    sender_avatar = serializers.SerializerMethodField()

    text = serializers.CharField(
        source="encrypted_text",
        read_only=True,
    )

    class Meta:
        model = Message
        fields = [
            "id",
            "username",
            "sender_avatar",
            "text",
            "caption",
            "media_type",
            "media_url",
            "thumbnail",
            "created_at",
        ]

    def get_sender_avatar(self, obj):
        avatar = getattr(obj.sender, "avatar", None)

        if not avatar:
            return None

        try:
            return avatar.url
        except AttributeError:
            return avatar

class BaseMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(
        source="sender.username",
        read_only=True,
    )

    sender_avatar = serializers.SerializerMethodField()

    reactions = serializers.SerializerMethodField()

    reply_to = BaseReplySerializer(
        read_only=True,
    )

    reply_to_id = serializers.PrimaryKeyRelatedField(
        queryset=Message.objects.all(),
        source="reply_to",
        write_only=True,
        required=False,
    )

    media_url = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )

    thumbnail = serializers.ListField(
        child=serializers.CharField(
            allow_null=True,
            allow_blank=True,
        ),
        required=False,
    )

    duration = serializers.ListField(
        child=serializers.IntegerField(
            allow_null=True,
        ),
        required=False,
    )

    waveform = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
    )

    forwarded_from = BaseReplySerializer(
        read_only=True,
    )
  
    mentions = MentionSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Message

        fields = [
            "id",
            "chat",

            "sender",
            "sender_username",
            "sender_avatar",

            "encrypted_text",
            "caption",

            "media_type",
            "media_source",
            "media_url",
            "thumbnail",
            "duration",
            "waveform",

            "reply_to",
            "reply_to_id",

            "forwarded_from",

            "mentions",

            "reactions",

            "client_id",

            "is_deleted",
            "deleted_by_admin",

            "is_pinned",
            "pinned_by",
            "pinned_at",

            "is_edited",
            "edited_at",

            "created_at",
        ]

        read_only_fields = [
            "sender",
            "pinned_by",
            "pinned_at",
            "created_at",
        ]

    def get_sender_avatar(self, obj):
        avatar = getattr(obj.sender, "avatar", None)

        if not avatar:
            return None

        try:
            return avatar.url
        except AttributeError:
            return avatar

    def get_reactions(self, obj):
        grouped = {}

        reactions = obj.reactions.select_related(
            "user"
        )

        for reaction in reactions:
            emoji = reaction.emoji

            if emoji not in grouped:
                grouped[emoji] = {
                    "emoji": emoji,
                    "count": 0,
                    "users": [],
                }

            grouped[emoji]["count"] += 1

            grouped[emoji]["users"].append({
                "id": reaction.user.id,
                "username": reaction.user.username,
            })

        return list(grouped.values())

    def create(self, validated_data):
        reply_to = validated_data.pop(
            "reply_to",
            None,
        )

        return Message.objects.create(
            reply_to=reply_to,
            **validated_data,
        )

class PrivateMessageSerializer(BaseMessageSerializer):
    status = serializers.SerializerMethodField()

    class Meta(BaseMessageSerializer.Meta):
        fields = BaseMessageSerializer.Meta.fields + [
            "status",
        ]

    def get_status(self, obj):
        request = self.context.get("request")

        if not request:
            return "sent"

        user = request.user

        other_participant = (
            ChatParticipant.objects
            .select_related("user")
            .filter(chat=obj.chat)
            .exclude(user=user)
            .first()
        )
  
        other_user = other_participant.user if other_participant else None

        if not other_user:
            return "sent"

        read_state = (
            ChatReadState.objects
            .filter(
                user=other_user,
                chat=obj.chat,
            )
            .first()
        )

        if (
            read_state
            and read_state.last_seen_message_id
            and read_state.last_seen_message_id >= obj.id
        ):
            return "seen"

        participant = (
            ChatParticipant.objects
            .filter(
                chat=obj.chat,
                user=other_user,
            )
            .first()
        )

        if (
            participant
            and participant.last_delivered_message_id
            and participant.last_delivered_message_id >= obj.id
        ):
            return "delivered"

        return "sent"

class CommunityMessageSerializer(BaseMessageSerializer):
    sender_role = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta(BaseMessageSerializer.Meta):
        fields = BaseMessageSerializer.Meta.fields + [
            "status",
            "sender_role",
        ]

    def get_sender_role(self, obj):
        chat = obj.chat

        if chat.chat_type != "community":
            return "member"

        community = getattr(chat, "community", None)

        if not community:
            return "member"

        if community.owner_id == obj.sender_id:
            return "owner"

        if community.admins.filter(
            id=obj.sender_id
        ).exists():
            return "admin"

        if community.moderators.filter(
            id=obj.sender_id
        ).exists():
            return "moderator"

        return "member"
  
    def get_status(self, obj):
      return "sent"

class ChatSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    display_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = "__all__"

    def get_last_message(self, obj):
        if obj.chat_type == "community":
            return CommunityMessageSerializer(
                obj.last_message,
                context=self.context,
            ).data
        
        return PrivateMessageSerializer(
            obj.last_message,
            context=self.context,
        ).data

    def get_display_name(self, obj):
        request = self.context["request"]

        if obj.chat_type == "community":
            return obj.community.name

        participant = (
            ChatParticipant.objects
            .select_related("user")
            .filter(chat=obj)
            .exclude(user=request.user)
            .first()
        )
        
        other = participant.user if participant else None
        
        return other.username if other else "Unknown"

    def get_display_avatar(self, obj):
        request = self.context["request"]

        if obj.chat_type == "community":
            return obj.community.avatar

        participant = (
            ChatParticipant.objects
            .select_related("user")
            .filter(chat=obj)
            .exclude(user=request.user)
            .first()
        )
        
        other = participant.user if participant else None
        
        return getattr(other, "avatar", None) if other else None

class VoiceRoomSerializer(serializers.ModelSerializer):

    class Meta:
        model = VoiceRoom
        fields = "__all__"

class CommunityEventSerializer(serializers.ModelSerializer):

    class Meta:
        model = CommunityEvent
        fields = "__all__"

class AnnouncementChannelSerializer(serializers.ModelSerializer):

    class Meta:
        model = AnnouncementChannel
        fields = "__all__"

class AnnouncementPostSerializer(serializers.ModelSerializer):

    class Meta:
        model = AnnouncementPost
        fields = "__all__"