from rest_framework import serializers
from .models import ContactReply
from feedback.models import (
    Feedback,
    Report,
    ProblemReport,
    SupportRequest,
    ContactMessage,
)
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

class FeedbackSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = [
            "id",
            "rating",
            "message",
            "resolved",
            "created_at",
            "user",
        ]

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "avatar": obj.user.avatar,
        }

class ProblemReportSerializer(serializers.ModelSerializer):
    reporter = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    report_category = serializers.SerializerMethodField()

    class Meta:
        model = ProblemReport
        fields = [
            "id",
            "report_category",
            "report_type",
            "status",
            "message",
            "created_at",
            "reporter",
            "user",
        ]

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "avatar": obj.user.avatar,
        }
        
    def get_reporter(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "avatar": obj.user.avatar,
        }

    def get_report_category(self, obj):
        return "problem"

class SimpleUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()

class SimplePostSerializer(serializers.Serializer):
    id = serializers.IntegerField()

class SimpleCommentSerializer(serializers.Serializer):
    id = serializers.IntegerField()

class SimpleMessageSerializer(serializers.Serializer):
    id = serializers.IntegerField()

class SimpleCommunitySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()

class ReportSerializer(serializers.ModelSerializer):
    reporter = serializers.SerializerMethodField()
    target_user = serializers.SerializerMethodField()
    target_post = serializers.SerializerMethodField()
    target_comment = serializers.SerializerMethodField()
    target_message = serializers.SerializerMethodField()
    target_community = serializers.SerializerMethodField()

    # Very useful for the details page
    target_type = serializers.SerializerMethodField()
    target_id = serializers.SerializerMethodField()
    report_category = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "reason",
            "details",
            "status",
            "report_type",
            "created_at",

            "reporter",
            "report_category",

            "target_type",
            "target_id",

            "target_user",
            "target_post",
            "target_comment",
            "target_message",
            "target_community",
        ]

    def get_reporter(self, obj):
        return {
            "id": obj.reporter.id,
            "username": obj.reporter.username,
            "email": obj.reporter.email,
        }
  
    def get_report_category(self, obj):
      return "content"

    def get_target_user(self, obj):
        if not obj.target_user:
            return None

        return {
            "id": obj.target_user.id,
            "username": obj.target_user.username,
            "email": obj.target_user.email,
        }

    def get_target_post(self, obj):
        if not obj.target_post:
            return None

        return {
            "id": obj.target_post.id,
        }

    def get_target_comment(self, obj):
        if not obj.target_comment:
            return None

        return {
            "id": obj.target_comment.id,
        }

    def get_target_message(self, obj):
        if not obj.target_message:
            return None

        return {
            "id": obj.target_message.id,
        }

    def get_target_community(self, obj):
        if not obj.target_community:
            return None

        return {
            "id": obj.target_community.id,
            "name": obj.target_community.name,
        }

    def get_target_type(self, obj):
        if obj.target_post:
            return "post"

        if obj.target_user:
            return "user"

        if obj.target_comment:
            return "comment"

        if obj.target_message:
            return "message"

        if obj.target_community:
            return "community"

        if obj.target_repost:
            return "repost"

        return None

    def get_target_id(self, obj):
        if obj.target_post:
            return obj.target_post.id

        if obj.target_user:
            return obj.target_user.id

        if obj.target_comment:
            return obj.target_comment.id

        if obj.target_message:
            return obj.target_message.id

        if obj.target_community:
            return obj.target_community.id

        if obj.target_repost:
            return obj.target_repost.id

        return None

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
        )

    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )
        
        user.role = "admin"
        user.is_staff = True
        user.email_verified = True
        user.save()
        
        return user

class SupportRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    class Meta:
        model = SupportRequest
        fields = "__all__"


class ContactReplySerializer(serializers.ModelSerializer):

    sent_by_name = serializers.CharField(
        source="sent_by.username",
        read_only=True
    )


    class Meta:

        model = ContactReply

        fields = [
            "id",
            "message",
            "sent_by_name",
            "created_at",
        ]
  
class ContactMessageSerializer(serializers.ModelSerializer):

    replies = ContactReplySerializer(
        many=True,
        read_only=True
    )
  
    class Meta:
        model = ContactMessage
        fields = [
            "id",
            "name",
            "email",
            "subject",
            "message",
            "replies",
            "status",
            "admin_note",
            "created_at",
            "updated_at",
        ]