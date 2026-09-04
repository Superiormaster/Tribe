from rest_framework import serializers
from .models import Community, Tribe, CommunityMembership, TribeRequest, CommunityJoinRequest, CommunityMute, CommunityBan, CommunityInvite
from users.models import User
from media.models import MediaAsset
from users.utils import get_user_avatar

class TribeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tribe
        fields = "__all__"

class JoinedCommunitySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(
        source="community.id",
        read_only=True,
    )
    name = serializers.CharField(
        source="community.name",
        read_only=True,
    )
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = CommunityMembership
        fields = [
            "id",
            "name",
            "cover_image",
        ]
  
    def get_cover_image(self, obj):
        community = obj.community

        if community.cover_image_asset:
            return community.cover_image_asset.original_url

        return community.cover_image

class CommunityMuteSerializer(serializers.ModelSerializer):

    class Meta:
        model = CommunityMute
        fields = "__all__"

class CommunityBanSerializer(serializers.ModelSerializer):

    class Meta:
        model = CommunityBan
        fields = "__all__"

class CommunityNestedSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()
    requested = serializers.SerializerMethodField()
    invited = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    intro_video = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = ['id', 'name', 'members_count', 'owner', "intro_video", "requested", "require_post_approval", 'cover_image', 'joined', 'invited', 'description']

    def get_cover_image(self, obj):
        if obj.cover_image_asset:
            return obj.cover_image_asset.original_url

        return obj.cover_image

    def get_intro_video(self, obj):
        if obj.intro_video_asset:
            return obj.intro_video_asset.original_url

        return obj.intro_video

    def get_owner(self, obj):
        return {
            "id": obj.owner.id,
            "username": obj.owner.username,
        }

    def get_members_count(self, obj):
      banned_users = CommunityBan.objects.filter(
          community=obj
      ).values_list("user_id", flat=True)
      
      count = CommunityMembership.objects.filter(
          community=obj
      ).exclude(
          user_id__in=banned_users
      ).count()
  
      owner_exists = CommunityMembership.objects.filter(
          community=obj,
          user=obj.owner
      ).exists()
  
      if not owner_exists:
          count += 1
  
      return count

    def get_joined(self, obj):
        request = self.context.get("request")
    
        if not request or not request.user.is_authenticated:
            return False
    
        if not CommunityMembership.objects.filter(
            community=obj,
            user=request.user,
        ).exists():
            return False
    
        return not CommunityBan.objects.filter(
            community=obj,
            user=request.user,
        ).exists()
  
    def get_invited(self, obj):
      request = self.context.get("request")
  
      if not request or not request.user.is_authenticated:
          return False
  
      return CommunityInvite.objects.filter(
          community=obj,
          receiver=request.user
      ).exists()

    def get_requested(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return CommunityJoinRequest.objects.filter(
            user=request.user,
            community=obj
        ).exists()


class TribeDetailSerializer(serializers.ModelSerializer):
    communities = serializers.SerializerMethodField()

    class Meta:
        model = Tribe
        fields = ['id', 'name', 'description', 'communities']

    def get_communities(self, obj):
        return CommunityNestedSerializer(
            obj.communities.all(),
            many=True,
            context=self.context,
        ).data

class CommunitySerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    members_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    tribe = TribeSerializer(read_only=True)
    requested = serializers.SerializerMethodField()
    invited = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    cover_image_asset_id = serializers.SlugRelatedField(
        slug_field="media_id",
        source="cover_image_asset",
        queryset=MediaAsset.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    intro_video_asset_id = serializers.SlugRelatedField(
        slug_field="media_id",
        source="intro_video_asset",
        queryset=MediaAsset.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    cover_image_media_id = serializers.SerializerMethodField()
    intro_video_media_id = serializers.SerializerMethodField()

    cover_image_url = serializers.SerializerMethodField()
    intro_video_url = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = [
            'id',
            'name',
            'description',
            'rules',
            "cover_image_url",
            "intro_video_url",

            'cover_image_media_id',
            'intro_video_media_id',

            # Media input
            "cover_image_asset_id",
            "intro_video_asset_id",
            'allow_videos',
            'require_post_approval',
            'join_approval_required',
            'tribe',
            'owner',
            'members_count',
            'joined',
            'my_role',
            'website',
            'invited',
            'requested',
            'permissions',
        ]

        read_only_fields = [
            'owner',
            'members_count',
            'joined',
            "cover_image_url",
            "intro_video_url",
        ]

    def get_cover_image_url(self, obj):

        if obj.cover_image_asset:
            return obj.cover_image_asset.original_url

        # Legacy communities
        return obj.cover_image

    # --------------------------------
    # INTRO VIDEO
    # --------------------------------

    def get_intro_video_url(self, obj):

        if obj.intro_video_asset:
            return obj.intro_video_asset.original_url

        # Legacy communities
        return obj.intro_video

    def get_cover_image_media_id(self, obj):
        if obj.cover_image_asset:
            return obj.cover_image_asset.media_id
        return None

    def get_intro_video_media_id(self, obj):
        if obj.intro_video_asset:
            return obj.intro_video_asset.media_id
        return None

    def validate_cover_image_asset_id(self, asset):
        request = self.context.get("request")

        if request and asset.user_id != request.user.id:
            raise serializers.ValidationError(
                "You do not own this media asset."
            )

        if asset.status != "ready":
            raise serializers.ValidationError(
                "The cover image is not ready."
            )

        return asset

    def validate_intro_video_asset_id(self, asset):
        request = self.context.get("request")

        if request and asset.user_id != request.user.id:
            raise serializers.ValidationError(
                "You do not own this media asset."
            )

        if asset.status != "ready":
            raise serializers.ValidationError(
                "The intro video is not ready."
            )

        return asset
  
    def get_members_count(self, obj):
      banned_users = CommunityBan.objects.filter(
          community=obj
      ).values_list("user_id", flat=True)
      
      count = CommunityMembership.objects.filter(
          community=obj
      ).exclude(
          user_id__in=banned_users
      ).count()
  
      owner_exists = CommunityMembership.objects.filter(
          community=obj,
          user=obj.owner
      ).exists()
  
      if not owner_exists:
          count += 1
  
      return count
  
    def get_my_role(self, obj):
      request = self.context.get("request")
  
      if not request or not request.user.is_authenticated:
          return "member"
  
      if request.user == obj.owner:
          return "owner"
  
      if CommunityBan.objects.filter(
          community=obj,
          user=request.user,
      ).exists():
          return "member"
  
      membership = CommunityMembership.objects.filter(
          community=obj,
          user=request.user,
      ).first()
  
      if membership:
          return membership.role
  
      return "member"

    def get_permissions(self, obj):
      allow_reels = (
          obj.tribe.allow_reels
          if obj.tribe and not obj.override_reels
          else False
      )
  
      allow_videos = (
          obj.allow_videos
          if obj.override_reels
          else not allow_reels
      )
  
      return {
          "allow_reels": allow_reels,
          "allow_videos": allow_videos,
      }

    def get_invited(self, obj):
        request = self.context.get("request")
    
        if not request or not request.user.is_authenticated:
            return False
    
        return CommunityInvite.objects.filter(
            community=obj,
            receiver=request.user
        ).exists()

    def get_joined(self, obj):
        request = self.context.get("request")
    
        if not request or not request.user.is_authenticated:
            return False
    
        if not CommunityMembership.objects.filter(
            community=obj,
            user=request.user,
        ).exists():
            return False
    
        return not CommunityBan.objects.filter(
            community=obj,
            user=request.user,
        ).exists()

    def get_requested(self, obj):
        user = self.context["request"].user

        if not user.is_authenticated:
            return False

        return CommunityJoinRequest.objects.filter(
            user=user,
            community=obj
        ).exists()

class InviteUserSerializer(serializers.ModelSerializer):

    avatar = serializers.SerializerMethodField()
    invited = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "avatar",
            "invited",
        ]

    def get_avatar(self, obj):
        return get_user_avatar(obj)

    def get_invited(self, obj):

        invited_ids = self.context.get(
            "invited_ids",
            []
        )

        return obj.id in invited_ids

class CommunityInviteSerializer(serializers.ModelSerializer):

    sender = serializers.SerializerMethodField()
    community = serializers.SerializerMethodField()

    class Meta:
        model = CommunityInvite
        fields = [
            "id",
            "sender",
            "community",
            "created_at"
        ]

    def get_sender(self, obj):
        avatar = obj.sender.avatar
    
        return {
            "id": obj.sender.id,
            "username": obj.sender.username,
            "avatar": get_user_avatar(obj.sender)
        }

    def get_community(self, obj):

        return {
            "id": obj.community.id,
            "name": obj.community.name
        }

class TribeRequestSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(
        source="creator.username",
        read_only=True
    )

    creator_avatar = serializers.SerializerMethodField()

    class Meta:
        model = TribeRequest
        fields = (
            "id",
            "name",
            "description",
            "request_reason",
            "status",
            "creator",
            "creator_name",
            "creator_avatar",
            "created_at",
        )
        read_only_fields = (
            "id",
            "status",
            "creator",
            "created_at",
        )

    def get_creator_avatar(self, obj):
      return get_user_avatar(obj.creator)

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Tribe name is too short."
            )

        if TribeRequest.objects.filter(
            name__iexact=value,
            status="pending"
        ).exists():
            raise serializers.ValidationError(
                "A request for this tribe already exists."
            )

        return value

    def create(self, validated_data):
        validated_data["creator"] = self.context[
            "request"
        ].user

        return super().create(validated_data)