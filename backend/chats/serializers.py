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
    MessageMention,
)
from media.models import MediaAsset
from django.contrib.auth import get_user_model
from users.utils import get_user_avatar

User = get_user_model()

class MentionSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
  
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "avatar",
        ]
  
    def get_avatar(self, obj):
        return get_user_avatar(obj)

class MessageMentionSerializer(serializers.ModelSerializer):
    user = MentionSerializer(read_only=True)

    class Meta:
        model = MessageMention
        fields = [
            "user",
            "created_at",
        ]
  
class MediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAsset
        fields = [
            "media_id",
            "media_type",
            "original_url",
            "thumbnail_url",
            "thumbnail_status",
            "content_type",
            "size",
            "width",
            "height",
            "duration",
            "status",
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

    sender_username = serializers.CharField(
        source="sender.username",
        read_only=True,
    )

    sender_avatar = serializers.SerializerMethodField()

    encrypted_text = serializers.CharField(
        read_only=True,
    )

    media_url = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
  
    sender_info = serializers.SerializerMethodField()

    media_asset_ids = serializers.SerializerMethodField()

    media_assets = MediaAssetSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Message

        fields = [
            "id",
            "client_id",

            "sender",
            "sender_username",
            "sender_avatar",
            "sender_info",

            "encrypted_text",
            "caption",

            "media_type",

            "media_url",
            "thumbnail",
            "duration",

            "media_asset_ids",
            "media_assets",

            "waveform",

            "is_deleted",
            "deleted_by_admin",
            "deleted_at",
        ]

    def get_sender_avatar(self, obj):
        return get_user_avatar(obj.sender)

    def get_media_url(self, obj):
        return [
            asset.original_url
            for asset in obj.media_assets.all()
        ]

    def get_sender_info(self, obj):
      return {
          "id": obj.sender.id,
          "username": obj.sender.username,
          "avatar": get_user_avatar(obj.sender),
          "role": "member",
      }
  
    def get_thumbnail(self, obj):
        return [
            asset.thumbnail_url
            for asset in obj.media_assets.all()
        ]

    def get_duration(self, obj):
        return [
            asset.duration
            for asset in obj.media_assets.all()
        ]

    def get_media_asset_ids(self, obj):
        return [
            asset.media_id
            for asset in obj.media_assets.all()
        ]

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
        allow_null=True,
    )

    waveform = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        default=list,
    )

    media_asset_ids = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        default=list,
    )

    media_url = serializers.ListField(
        child=serializers.URLField(),
        write_only=True,
        required=False,
        default=list,
    )

    media_assets = MediaAssetSerializer(
        many=True,
        read_only=True,
    )

    external_media_urls = serializers.ListField(
        child=serializers.URLField(),
        read_only=True,
    )

    forwarded_from = BaseReplySerializer(
        read_only=True,
    )

    mentions = MessageMentionSerializer(
        many=True,
        read_only=True,
    )

    server_id = serializers.IntegerField(
        source="id",
        read_only=True,
    )

    mention_user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list,
    )

    mention_all = serializers.BooleanField(
        required=False,
        default=False,
    )

    client_created_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
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

            # INPUT
            "media_asset_ids",
            "media_url",

            # OUTPUT
            "media_assets",
            "external_media_urls",

            "waveform",

            "reply_to",
            "reply_to_id",

            "forwarded_from",

            "mentions",
            "mention_user_ids",
            "mention_all",

            "reactions",

            "client_id",
            "client_created_at",
            "server_id",

            "is_deleted",
            "deleted_by_admin",
            "deleted_at",

            "is_pinned",
            "pinned_by",
            "pinned_at",

            "is_edited",
            "edited_at",

            "created_at",
        ]

        read_only_fields = [
            "id",
            "chat",
            "sender",
            "community",
            "reply_to",
            "media_assets",
            "external_media_urls",
            "pinned_by",
            "pinned_at",
            "created_at",
        ]

    def get_sender_avatar(self, obj):
        return get_user_avatar(obj.sender)

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

    def validate(self, attrs):

        encrypted_text = attrs.get(
            "encrypted_text",
            ""
        )

        caption = attrs.get(
            "caption",
            ""
        )

        media_source = attrs.get(
            "media_source"
        )

        media_asset_ids = attrs.get(
            "media_asset_ids",
            []
        )

        media_url = attrs.get(
            "media_url",
            []
        )

        if media_asset_ids is None:
            media_asset_ids = []

        if media_url is None:
            media_url = []

        media_asset_ids = [
            str(asset_id).strip()
            for asset_id in media_asset_ids
            if str(asset_id).strip()
        ]

        media_url = [
            url.strip()
            for url in media_url
            if isinstance(url, str)
            and url.strip()
        ]

        attrs["media_asset_ids"] = media_asset_ids
        attrs["media_url"] = media_url

        has_text = (
            isinstance(encrypted_text, str)
            and encrypted_text.strip()
        )

        has_caption = (
            isinstance(caption, str)
            and caption.strip()
        )

        has_uploaded_media = (
            media_source == "upload"
            and bool(media_asset_ids)
        )

        has_external_media = (
            media_source == "external"
            and bool(media_url)
        )

        if not (
            has_text
            or has_caption
            or has_uploaded_media
            or has_external_media
        ):
            raise serializers.ValidationError(
                "Message cannot be empty."
            )

        if media_source == "upload":

            if not media_asset_ids:
                raise serializers.ValidationError({
                    "media_asset_ids":
                        "Uploaded media requires media_asset_ids."
                })

            if media_url:
                raise serializers.ValidationError({
                    "media_url":
                        "Uploaded media must not use media_url."
                })

        elif media_source == "external":

            if not media_url:
                raise serializers.ValidationError({
                    "media_url":
                        "External media requires media_url."
                })

            if media_asset_ids:
                raise serializers.ValidationError({
                    "media_asset_ids":
                        "External media must not use media_asset_ids."
                })

        elif media_source in (None, "", "text"):

            if media_asset_ids:
                raise serializers.ValidationError({
                    "media_asset_ids":
                        "Text messages cannot contain media assets."
                })

            if media_url:
                raise serializers.ValidationError({
                    "media_url":
                        "Text messages cannot contain external media."
                })

        else:

            raise serializers.ValidationError({
                "media_source":
                    "Invalid media source."
            })

        return attrs

    def create(self, validated_data):
        validated_data.pop(
            "media_asset_ids",
            None,
        )

        validated_data.pop(
            "media_url",
            None,
        )

        validated_data.pop(
            "mention_user_ids",
            None,
        )

        return Message.objects.create(
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
  
      # Community owner always has owner role
      if community.owner_id == obj.sender_id:
          return "owner"
  
      # Roles are stored in CommunityMembership
      membership = (
          community.memberships
          .filter(user_id=obj.sender_id)
          .only("role")
          .first()
      )
  
      if not membership:
          return "member"
  
      return membership.role
  
    def get_status(self, obj):
      request = self.context.get("request")
  
      if not request:
          return "sent"
  
      user = request.user

      if obj.sender_id != user.id:
        return "sent"
  
      participants = (
          ChatParticipant.objects
          .filter(chat=obj.chat)
          .exclude(user=user)
      )
  
      if participants.filter(
          last_delivered_message_id__gte=obj.id
      ).exists():
          delivered = True
      else:
          delivered = False
  
      if ChatReadState.objects.filter(
          chat=obj.chat,
          user__in=participants.values("user_id"),
          last_seen_message_id__gte=obj.id,
      ).exists():
          return "seen"
  
      if delivered:
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
          community = obj.community
  
          # New MediaAsset system
          cover_asset = getattr(
              community,
              "cover_image_asset",
              None
          )
  
          if cover_asset:
              original_url = cover_asset.original_url
  
              if isinstance(original_url, list):
                  return (
                      original_url[0]
                      if original_url
                      else None
                  )
  
              if original_url:
                  return original_url
  
          # Legacy community image
          return getattr(
              community,
              "cover_image",
              None
          )
  
      # Private chat
      participant = (
          ChatParticipant.objects
          .select_related("user")
          .filter(chat=obj)
          .exclude(user=request.user)
          .first()
      )
  
      other = participant.user if participant else None
  
      return (
          get_user_avatar(other)
          if other
          else None
      )

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