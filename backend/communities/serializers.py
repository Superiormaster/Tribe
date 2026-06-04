from rest_framework import serializers
from .models import Community, Tribe, CommunityMembership, CommunityInvite
from users.models import User

class TribeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tribe
        fields = "__all__"

class CommunityNestedSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = ['id', 'name', 'members_count', 'owner', "intro_video", "require_post_approval", 'cover_image', 'joined', 'description']

    def get_owner(self, obj):
        return {
            "id": obj.owner.id,
            "username": obj.owner.username,
        }

    def get_members_count(self, obj):
        return CommunityMembership.objects.filter(
            community=obj,
            banned=False
        ).count()

    def get_joined(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return CommunityMembership.objects.filter(
            community=obj,
            user=request.user,
            banned=False
        ).exists()


class TribeDetailSerializer(serializers.ModelSerializer):
    communities = CommunityNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Tribe
        fields = ['id', 'name', 'description', 'communities']

class CommunitySerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    members_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    tribe = TribeSerializer(read_only=True)

    class Meta:
        model = Community
        fields = [
            'id',
            'name',
            'description',
            'cover_image',
            'intro_video',
            'require_post_approval',
            'tribe',
            'owner',
            'members_count',
            'joined',
            'my_role'
        ]

        read_only_fields = [
            'owner',
            'members_count',
            'joined'
        ]

    def get_members_count(self, obj):
        return CommunityMembership.objects.filter(
            community=obj,
            banned=False
        ).count()

    def get_my_role(self, obj):
      request = self.context.get("request")
  
      if not request or not request.user.is_authenticated:
          return "member"
  
      if request.user == obj.owner:
          return "owner"
  
      membership = CommunityMembership.objects.filter(
          user=request.user,
          community=obj
      ).first()
  
      return membership.role if membership else "member"

    def get_joined(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return CommunityMembership.objects.filter(
            community=obj,
            user=request.user,
            banned=False
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