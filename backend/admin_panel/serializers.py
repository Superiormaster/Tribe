from rest_framework import serializers
from feedback.models import Report
from communities.models import TribeRequest
from django.contrib.auth import get_user_model

User = get_user_model()


class AdminTribeRequestSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(
        source="creator.username",
        read_only=True
    )

    creator_email = serializers.EmailField(
        source="creator.email",
        read_only=True
    )

    creator_avatar = serializers.SerializerMethodField()

    reviewed_by = serializers.CharField(
        source="reviewed_by.username",
        read_only=True
    )

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
            "creator_email",
            "creator_avatar",
            "created_at",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
        )

    def get_creator_avatar(self, obj):
      if obj.creator.avatar:
          return obj.creator.avatar
      return None


class ApproveTribeRequestSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()


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