from rest_framework import serializers
from users.models import User
from communities.models import Community, Tribe

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