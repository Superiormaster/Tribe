from rest_framework import serializers
from feedback.models import Report
from communities.models import Tribe, TribeRequest
from django.contrib.auth import get_user_model

User = get_user_model()

class CreatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "avatar",
        )

class TribeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tribe
        fields = ("id", "name")

class AdminTribeRequestSerializer(serializers.ModelSerializer):
    creator = CreatorSerializer(read_only=True)
    reviewed_by = CreatorSerializer(read_only=True)
    tribe = TribeSerializer(read_only=True)

    class Meta:
        model = TribeRequest
        fields = (
            "id",
            "name",
            "description",
            "request_reason",
            "status",
            "creator",
            "created_at",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "tribe",
        )

    def get_creator_avatar(self, obj):
      if obj.creator.avatar:
          return obj.creator.avatar
      return None

class RejectTribeRequestSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()

    reason = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=500
    )

class TribeRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = TribeRequest
        fields = '__all__'


class CreateTribeSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    name = serializers.CharField(max_length=255)
    description = serializers.CharField()
    allow_reels = serializers.BooleanField(default=False)

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

class CreateAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "creator_type",
        )

    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User(**validated_data)

        user.role = "admin"
        user.is_staff = True
        user.email_verified = True

        user.set_password(password)
        user.save()

        return user