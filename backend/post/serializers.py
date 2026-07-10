from rest_framework import serializers
from users.models import User, Star
from communities.models import Community, CommunityMembership
from .models import Post, PostMedia, Like, Comment, Feed, Repost
from users.serializers import UserSerializer

class UserMiniSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "avatar"]

    def get_avatar(self, obj):
        if obj.avatar:
            return str(obj.avatar)
        return None

class PostMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = PostMedia
        fields = ["id", "media_type", "file_url", "thumbnail_url"]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file if obj.file else None
        return None

    def get_thumbnail_url(self, obj):
        if not obj.file:
            return None

        if obj.media_type == "video":
            return obj.thumbnail or obj.file.replace(
                "/upload/",
                "/upload/so_0,w_300,h_300,c_fill/"
            )

        return obj.thumbnail or obj.file.replace(
            "/upload/",
            "/upload/w_300,h_300,c_fill/"
        )

class PostSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    media_files = PostMediaSerializer(many=True, read_only=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    community_id = serializers.IntegerField(source="community.id", read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.BooleanField(read_only=True)
    is_edited = serializers.BooleanField(read_only=True)
    profile_pinned = serializers.BooleanField(read_only=True)
    profile_pin_order = serializers.IntegerField(read_only=True)
    community_pinned = serializers.BooleanField(read_only=True)
    community_pin_order = serializers.IntegerField(read_only=True)
    is_reposted = serializers.SerializerMethodField()
    views_count = serializers.IntegerField(read_only=True)
    shares_count = serializers.IntegerField(read_only=True)
    is_starred_by_user = serializers.SerializerMethodField()
    is_starred = serializers.BooleanField(read_only=True)
    community_joined = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id',
            'user',
            'user_username',
            'content_type',
            'media_files',
            'caption',
            'is_liked',
            'is_starred_by_user',
            'is_starred',
            'community',
            'community_name',
            'community_id',
            'created_at',
            'updated_at',
            'likes_count',
            'comments_count',
            'views_count',
            'shares_count',
            'is_reposted',
            'is_edited',
            'community_joined',
            "profile_pinned",
            "profile_pin_order",
            "community_pinned",
            "community_pin_order",
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'media_files']

    def create(self, validated_data):
      request = self.context.get('request')
      validated_data['user'] = request.user
      return Post.objects.create(**validated_data)

    def validate(self, data):
      community = data.get('community')
      content_type = data.get('content_type')
  
      if (
          content_type == 'short_video'
          and community
          and not community.tribe.allow_reels
      ):
          raise serializers.ValidationError(
              "Reels only allowed in entertainment tribe"
          )
  
      return data

    def get_is_starred_by_user(self, obj):
      user = self.context["request"].user
  
      return Star.objects.filter(
          star=user,
          starred_user=obj.user
      ).exists()

    def get_is_starred(self, obj):
      request = self.context.get("request")
      if not request or not request.user.is_authenticated:
          return False
  
      return Star.objects.filter(
          star=request.user,
          starred_user=obj.user
      ).exists()

    def get_community_joined(self, obj):

      user = self.context["request"].user
  
      if not user.is_authenticated:
          return False
  
      return CommunityMembership.objects.filter(
          community=obj.community,
          user=user,
          banned=False
      ).exists()

    def get_is_reposted(self, obj):
        user = self.context["request"].user
        return obj.reposts.filter(user=user).exists()

# -------------------------------
# Like Serializer
# -------------------------------
class LikeSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = Like
        fields = ['id', 'user', 'post', 'created_at']
        read_only_fields = ['user']

# -------------------------------
# Comment Serializer
# -------------------------------
class CommentSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.BooleanField(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(),
        required=False,
        allow_null=True
    )
    root_parent_id = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "user", "post", "text", "created_at", "parent", "replies", "likes_count", "is_liked", "root_parent_id"]
        read_only_fields = ['user']

    def validate(self, data):
      if not data.get("text"):
          raise serializers.ValidationError({"text": "Comment cannot be empty"})
      return data

    def get_root_parent_id(self, obj):
        return obj.get_root_parent().id

    def get_is_liked(self, obj):
      request = self.context.get("request")
      if request and request.user.is_authenticated:
          return obj.likes.filter(user=request.user).exists()
      return False

    def get_replies(self, obj):
      return CommentSerializer(
          obj.replies.filter(is_deleted=False).order_by("created_at"),
          many=True,
          context=self.context
      ).data

# -------------------------------
# Feed Serializer
# -------------------------------
class FeedSerializer(serializers.ModelSerializer):
    post = PostSerializer(read_only=True)

    class Meta:
        model = Feed
        fields = ['id', 'user', 'post', 'created_at']
        read_only_fields = ['user', 'post', 'created_at']


class RepostSerializer(serializers.ModelSerializer):

    user = UserSerializer(read_only=True)
    post = PostSerializer(read_only=True)
    is_starred_by_user = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Repost
        fields = [
            "id",
            "type",
            "user",
            "post",
            "repost_type",
            "quote_text",
            "created_at",
            "is_starred_by_user",
        ]

    def get_type(self, obj):
        return "repost"

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if data.get("post"):
            data["post"]["likes_count"] = getattr(
                instance,
                "likes_count",
                0
            )

            data["post"]["comments_count"] = getattr(
                instance,
                "comments_count",
                0
            )

            data["post"]["shares_count"] = getattr(
                instance,
                "shares_count",
                0
            )

            data["post"]["repost_count"] = getattr(
                instance,
                "repost_count",
                0
            )

        return data
  
    def get_is_starred_by_user(self, obj):
        starred_ids = self.context.get("starred_ids", set())
        return obj.user.id in starred_ids
