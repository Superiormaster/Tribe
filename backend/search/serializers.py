from rest_framework import serializers

from users.models import User
from users.utils import get_user_avatar
from communities.models import Community, Tribe


class UserSearchSerializer(serializers.ModelSerializer):
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


class CommunitySearchSerializer(serializers.ModelSerializer):
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Community
        fields = [
            "id",
            "name",
            "cover_image",
        ]

    def get_cover_image(self, obj):
        if obj.cover_image_asset:
            return obj.cover_image_asset.original_url

        # Legacy communities
        return obj.cover_image


class TribeSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tribe
        fields = [
            "id",
            "name",
        ]