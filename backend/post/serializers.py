from rest_framework import serializers
from users.models import User
from communities.models import Community
from .models import Post, PostMedia, Like, Comment, Feed

class UserMiniSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["username", "avatar"]

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
    is_reposted = serializers.SerializerMethodField()
    views_count = serializers.IntegerField(read_only=True)
    shares_count = serializers.IntegerField(read_only=True)
    is_starred_by_user = serializers.BooleanField(read_only=True)

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
            'community',
            'community_name',
            'community_id',
            'created_at',
            'likes_count',
            'comments_count',
            'views_count',
            'shares_count',
            'is_reposted'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'media_files']

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
      request = self.context.get("request")
  
      if request and request.user.is_authenticated:
          return obj.user.stars_received.filter(
              star=request.user
          ).exists()
  
      return False

    def get_is_reposted(self, obj):
        user = self.context["request"].user
        return obj.reposts.filter(user=user).exists()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

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