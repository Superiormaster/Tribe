from rest_framework import serializers
from .models import (
    Chat,
    Message,
    MessageReaction,
    CommunityMute,
    CommunityBan,
    MessageReport,
    VoiceRoom,
    CommunityEvent,
    AnnouncementChannel,
    AnnouncementPost,
    MessageThread,
    ThreadReply,
    ChatReadState,
    ChatParticipant,
)

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
            "username",
            "user",
            "count",
        ]

    def get_count(self, obj):
        return MessageReaction.objects.filter(
            message=obj.message,
            emoji=obj.emoji
        ).count()

class ReplySerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source='sender.username',
        read_only=True
    )

    text = serializers.CharField(
        source="encrypted_text"
    )

    class Meta:
        model = Message

        fields = [
            'id',
            'username',
            'text',
        ]

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(
        source="sender.username",
        read_only=True
    )

    sender_avatar = serializers.SerializerMethodField()

    sender_role = serializers.SerializerMethodField()

    reactions = serializers.SerializerMethodField()

    reply_to = ReplySerializer(
        read_only=True
    )

    reply_to_id = serializers.PrimaryKeyRelatedField(
        queryset=Message.objects.all(),
        source="reply_to",
        write_only=True,
        required=False
    )
  
    media_url = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
  
    thumbnail = serializers.ListField(
        child=serializers.CharField(
            allow_null=True,
            allow_blank=True
        ),
        required=False
    )
  
    duration = serializers.ListField(
        child=serializers.IntegerField(
            allow_null=True
        ),
        required=False
    )
  
    waveform = serializers.ListField(
      child=serializers.FloatField(),
      required=False
    )
  
    status = serializers.SerializerMethodField()

    class Meta:
        model = Message

        fields = [
            "id",
            "chat",
            "sender",
            "sender_username",
            "sender_avatar",
            "sender_role",
            "encrypted_text",
            "caption",
            "media_url",
            "media_type",
            "thumbnail",
            "duration",
            "waveform",
            "reactions",
            "is_pinned",
            "client_id",
            'reply_to',
            'reply_to_id',
            'is_deleted',
            'deleted_by_admin',
            "created_at",
            "seen_by",
            "status",
        ]

        read_only_fields = [
            "sender",
            "seen_by",
        ]

    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'avatar': (
                obj.user.avatar.url
                if obj.user.avatar
                else None
            ),
            'role': getattr(
                obj.user,
                'community_role',
                'member'
            )
        }

    def get_sender_avatar(self, obj):
      avatar = getattr(obj.sender, "avatar", None)
  
      if not avatar:
          return None
  
      try:
          return avatar.url
      except AttributeError:
          return avatar

    def get_sender_role(self, obj):

        chat = obj.chat

        if chat.chat_type != "community":
            return "member"

        community = chat.community

        if community.owner == obj.sender:
            return "owner"

        if community.admins.filter(
            id=obj.sender.id
        ).exists():
            return "admin"

        if community.moderators.filter(
            id=obj.sender.id
        ).exists():
            return "moderator"

        return "member"

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
      reply_to_id = validated_data.pop('reply_to_id', None)
  
      reply_message = None
      if reply_to_id:
          reply_message = Message.objects.filter(id=reply_to_id).first()
  
      validated_data['reply_to'] = reply_message
  
      return super().create(validated_data)
  
    def get_status(self, obj):
      request = self.context.get("request")
  
      if not request:
          return "sent"
  
      user = request.user
  
      if obj.sender_id != user.id:
          return None
  
      other_user = (
          obj.chat.members
          .exclude(id=user.id)
          .first()
      )
  
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
          read_state and
          read_state.last_seen_message_id and
          read_state.last_seen_message_id >= obj.id
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
          participant and
          participant.last_delivered_message_id and
          participant.last_delivered_message_id >= obj.id
      ):
          return "delivered"
  
      return "sent"

class ChatSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    display_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = "__all__"

    def get_last_message(self, obj):
        if not obj.last_message:
            return None

        return MessageSerializer(obj.last_message).data

    def get_display_name(self, obj):
        request = self.context["request"]

        if obj.chat_type == "community":
            return obj.community.name

        other = obj.members.exclude(
            id=request.user.id
        ).first()

        return other.username if other else "Unknown"

    def get_display_avatar(self, obj):
        request = self.context["request"]

        if obj.chat_type == "community":
            return obj.community.avatar

        other = obj.members.exclude(
            id=request.user.id
        ).first()

        return getattr(other, "avatar", None)

class CommunityMuteSerializer(serializers.ModelSerializer):

    class Meta:
        model = CommunityMute
        fields = "__all__"

class CommunityBanSerializer(serializers.ModelSerializer):

    class Meta:
        model = CommunityBan
        fields = "__all__"

class MessageReportSerializer(serializers.ModelSerializer):

    class Meta:
        model = MessageReport
        fields = "__all__"

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

class ThreadReplySerializer(serializers.ModelSerializer):

    sender_username = serializers.CharField(
        source="sender.username",
        read_only=True
    )

    class Meta:
        model = ThreadReply
        fields = "__all__"

class MessageThreadSerializer(serializers.ModelSerializer):

    replies = ThreadReplySerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = MessageThread
        fields = "__all__"