from rest_framework import serializers
from .models import Community, Tribe

class TribeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tribe
        fields = "__all__"

class CommunityNestedSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = ['id', 'name', 'members_count', 'cover_image', 'joined', 'description']

    def get_members_count(self, obj):
        return obj.members.count()

    def get_joined(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            return obj.members.filter(id=user.id).exists()
        return False


class TribeDetailSerializer(serializers.ModelSerializer):
    communities = CommunityNestedSerializer(many=True, read_only=True)

    class Meta:
        model = Tribe
        fields = ['id', 'name', 'description', 'communities']

class CommunitySerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    members_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()
    tribe = TribeSerializer(read_only=True)

    class Meta:
        model = Community
        fields = ['id', 'name', 'description', 'cover_image', 'intro_video', 'require_post_approval',
                  'tribe', 'owner', 'members_count', 'joined']
        read_only_fields = ['owner', 'members_count', 'joined']

    def get_members_count(self, obj):
        return obj.members.count()

    def get_joined(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            return obj.members.filter(id=user.id).exists()
        return False