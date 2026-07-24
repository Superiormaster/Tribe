from rest_framework import serializers
from .models import Community, Tribe, CommunityMembership, TribeRequest, CommunityJoinRequest, CommunityMute, CommunityBan, CommunityInvite
from users.models import User

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
    cover_image = serializers.CharField(
        source="community.cover_image",
        read_only=True,
    )

    class Meta:
        model = CommunityMembership
        fields = [
            "id",
            "name",
            "cover_image",
        ]

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

    class Meta:
        model = Community
        fields = ['id', 'name', 'members_count', 'owner', "intro_video", "requested", "require_post_approval", 'cover_image', 'joined', 'invited', 'description']

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

    class Meta:
        model = Community
        fields = [
            'id',
            'name',
            'description',
            'cover_image',
            'intro_video',
            'require_post_approval',
            'join_approval_required',
            'tribe',
            'owner',
            'members_count',
            'joined',
            'my_role',
            'invited',
            'requested'
        ]

        read_only_fields = [
            'owner',
            'members_count',
            'joined'
        ]

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
        return getattr(obj, "avatar", None)

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
            "avatar": (
                avatar.url if hasattr(avatar, "url") and avatar else avatar
            )
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
      if obj.creator.avatar:
          return obj.creator.avatar
      return None

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