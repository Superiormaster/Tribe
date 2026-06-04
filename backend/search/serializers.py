from rest_framework import serializers
from users.models import User
from communities.models import Community, Tribe
from post.models import Post, Repost

class PostSearchSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    media_type = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "caption",
            "user",
            "media",
            "media_type",
            "created_at"
        ]

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "avatar": getattr(obj.user, "avatar", None)
        }

    def get_media_type(self, obj):
        media = obj.media_files.first()
        return media.media_type if media else "text"

    def get_media(self, obj):
      return [
          {
              "type": m.media_type,
              "url": m.file if isinstance(m.file, str) else getattr(m.file, "url", None),
              "thumbnail": m.thumbnail.url if m.thumbnail else None
          }
          for m in obj.media_files.all()
      ]

class RepostSearchSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    media_type = serializers.SerializerMethodField()
    caption = serializers.SerializerMethodField()

    class Meta:
        model = Repost
        fields = [
            "id",
            "caption",
            "quote_text",
            "repost_type",
            "user",
            "media",
            "media_type",
            "created_at"
        ]

    def get_caption(self, obj):
        return obj.post.caption

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "avatar": getattr(obj.user, "avatar", None)
        }

    def get_media_type(self, obj):
        media = obj.post.media_files.first()

        return media.media_type if media else "text"

    def get_media(self, obj):
        return [
            {
              "type": m.media_type,
              "url": m.file if isinstance(m.file, str) else getattr(m.file, "url", None),
              "thumbnail": m.thumbnail.url if m.thumbnail else None
            }
            for m in obj.post.media_files.all()
        ]

class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "avatar"]

class CommunitySearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Community
        fields = ["id", "name", "cover_image"]

class TribeSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tribe
        fields = ["id", "name"]