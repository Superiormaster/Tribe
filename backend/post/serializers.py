from rest_framework import serializers
from users.models import User, Star
from communities.models import Community, CommunityMembership, CommunityBan
from .models import Post, PostMedia, Like, Comment, Bookmark, Feed, Repost, Share
from users.serializers import UserSerializer
from django.db.models import Count, Exists, OuterRef, Q
from users.utils import get_user_avatar

def get_annotated_post_queryset(user):
    return Post.objects.select_related("user", "community").annotate(
        likes_count=Count("likes", distinct=True),
        comments_count=Count(
            "comments",
            filter=Q(comments__is_deleted=False),
            distinct=True,
        ),
        shares_count=Count(
            "shares",
            filter=Q(
                shares__is_deleted=False,
                shares__status="approved",
            ),
            distinct=True,
        ),
        is_liked=Exists(
            Like.objects.filter(post=OuterRef("pk"), user=user)
        )
    )

class UserMiniSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "avatar"]

    def get_avatar(self, obj):
      return get_user_avatar(obj)

class PostMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    media_id = serializers.CharField(
        source="asset.media_id",
        read_only=True,
    )

    class Meta:
        model = PostMedia

        fields = (
            "id",
            "media_id",
            "media_type",
            "file_url",
            "thumbnail_url",
        )

    def get_file_url(self, obj):
        if obj.asset:
            return obj.asset.original_url

        # Legacy records
        return obj.file

    def get_thumbnail_url(self, obj):
        if obj.asset and obj.asset.thumbnail_url:
            return obj.asset.thumbnail_url

        # Legacy records
        return obj.thumbnail

class PostSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    media_files = PostMediaSerializer(many=True, read_only=True)
    community_name = serializers.CharField(source='community.name', read_only=True)
    community_id = serializers.IntegerField(source="community.id", read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.BooleanField(read_only=True)
    is_bookmarked = serializers.SerializerMethodField()
    is_edited = serializers.BooleanField(read_only=True)
    profile_pinned = serializers.BooleanField(read_only=True)
    profile_pin_order = serializers.IntegerField(read_only=True)
    community_pinned = serializers.BooleanField(read_only=True)
    community_pin_order = serializers.IntegerField(read_only=True)
    is_reposted = serializers.SerializerMethodField()
    has_reposted = serializers.SerializerMethodField()
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
            'has_reposted',
            'is_edited',
            "client_post_id",
            'community_joined',
            "profile_pinned",
            "profile_pin_order",
            "community_pinned",
            "community_pin_order",
            "is_approved",
            "is_bookmarked",
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

    def get_has_reposted(self, obj):
        request = self.context.get("request")

        if not request or request.user.is_anonymous:
            return False

        return Repost.objects.filter(
            user=request.user,
            post=obj,
            is_deleted=False,
        ).exists()
  
    def get_is_bookmarked(self, obj):
      request = self.context.get("request")
  
      if not request or not request.user.is_authenticated:
          return False
  
      if "bookmark_target" in self.context:
          target = self.context["bookmark_target"]
  
          if target["type"] == "repost":
              return Bookmark.objects.filter(
                  user=request.user,
                  repost_id=target["id"],
              ).exists()
  
          if target["type"] == "share":
              return Bookmark.objects.filter(
                  user=request.user,
                  share_id=target["id"],
              ).exists()
  
          if target["type"] == "post":
              return Bookmark.objects.filter(
                  user=request.user,
                  post_id=obj.id,
                  repost__isnull=True,
                  share__isnull=True,
              ).exists()
  
      # Normal standalone post
      return Bookmark.objects.filter(
          user=request.user,
          post_id=obj.id,
          repost__isnull=True,
          share__isnull=True,
      ).exists()

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
        request = self.context.get("request")
    
        if not request or not request.user.is_authenticated:
            return False
    
        if not CommunityMembership.objects.filter(
            community=obj.community,
            user=request.user,
        ).exists():
            return False
    
        return not CommunityBan.objects.filter(
            community=obj.community,
            user=request.user,
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
    reply_to_user = serializers.SerializerMethodField()
    root_parent_id = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "user", "post", "text", "created_at", "parent", "replies", "client_id", "likes_count", "reply_to_user", "is_liked", "root_parent_id"]
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
          obj.replies.all(),
          many=True,
          context=self.context,
      ).data
  
    def get_reply_to_user(self, obj):
      if obj.parent:
          return {
              "id": obj.parent.user.id,
              "username": obj.parent.user.username,
          }
      return None

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
    post = serializers.SerializerMethodField()
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
  
    def get_post(self, obj):
        annotated_post = (
            get_annotated_post_queryset(self.context["request"].user)
            .filter(id=obj.post_id)
            .first()
        )
        return PostSerializer(
            annotated_post,
            context={
                **self.context,
                "bookmark_target": {
                    "type": "repost",
                    "id": obj.id,
                },
            }
        ).data

    def get_is_starred_by_user(self, obj):
        starred_ids = self.context.get("starred_ids", set())
        return obj.user.id in starred_ids

class ShareSerializer(serializers.ModelSerializer):

    user = UserSerializer(read_only=True)
    post = serializers.SerializerMethodField()
    is_starred_by_user = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Share
        fields = [
            "id",
            "type",
            "user",
            "post",
            "community",
            "share_text",
            "status",
            "created_at",
            "is_starred_by_user",
        ]

    def get_type(self, obj):
        return "share"

    def get_post(self, obj):
        annotated_post = (
            get_annotated_post_queryset(self.context["request"].user)
            .filter(id=obj.post_id)
            .first()
        )
        return PostSerializer(
            annotated_post,
            context={
                **self.context,
                "bookmark_target": {
                    "type": "share",
                    "id": obj.id,
                },
            }
        ).data

    def get_is_starred_by_user(self, obj):
        starred_ids = self.context.get("starred_ids", set())
        return obj.user.id in starred_ids

class BookmarkSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()
    post = serializers.SerializerMethodField()
    repost = serializers.SerializerMethodField()
    share = serializers.SerializerMethodField()

    class Meta:
        model = Bookmark
        fields = [
            "id",
            "type",
            "post",
            "repost",
            "share",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]

    def get_type(self, obj):
      if obj.share_id:
          return "share"
  
      if obj.repost_id:
          return "repost"
  
      if obj.post_id:
          if obj.post.content_type == "short_video":
              return "reel"
  
          return "post"
  
      return "post"

    def get_post(self, obj):
        """
        Always return the underlying original post.

        This is used by PostCard/ReelCard and is also
        embedded inside repost/share serializers.
        """
        if not obj.post:
            return None

        return PostSerializer(
            obj.post,
            context=self.context,
        ).data

    def get_repost(self, obj):
        if not obj.repost:
            return None

        return RepostSerializer(
            obj.repost,
            context=self.context,
        ).data

    def get_share(self, obj):
        if not obj.share:
            return None

        return ShareSerializer(
            obj.share,
            context=self.context,
        ).data