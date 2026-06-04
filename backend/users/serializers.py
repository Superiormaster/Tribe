from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import IntegrityError
from .models import Star
from post.models import PostView

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        validate_email(value)

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with that email already exists."
            )

        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        try:
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email"],
                password=validated_data["password"],
                email_verified=False,
            )

            user.generate_verification_code()

            return user

        except IntegrityError:
            raise serializers.ValidationError(
                {"detail": "Registration failed. Username or email already exists."}
            )

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)

        user = self.user

        if not user.email_verified:
            raise serializers.ValidationError({
                "error": "Email not verified. Please verify your email first."
            })

        return data

class GoogleAuthSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True)  # the Google OAuth token

    def validate(self, data):
        token = data.get('token')
        # Verify token with Google API
        from google.oauth2 import id_token
        from google.auth.transport import requests

        try:
            idinfo = id_token.verify_oauth2_token(token, requests.Request())
        except ValueError:
            raise serializers.ValidationError("Invalid Google token")

        # idinfo contains user info
        data['email'] = idinfo.get('email')
        data['name'] = idinfo.get('name')
        return data

class ProfileSerializer(serializers.ModelSerializer):
    stars_count = serializers.SerializerMethodField()
    starred_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "avatar",
            "cover_photo",
            "full_name",
            "bio",
            "city",
            "country",
            "website",
            "creator_type",
            "interests",
            "gender",
            "date_of_birth",

            # optional profile fields
            "verified",
            "tips_enabled",
            "subscription_price",
            "support_link",
            "newsletter_link",

            # star stats
            "stars_count",
            "starred_count",
            "onboarding_step",
        ]

        read_only_fields = ["email", "username"]

    def validate_avatar(self, value):
        # Only check size if it's a file upload
        if hasattr(value, "size") and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Avatar file too large.")
        return value

    def get_stars_count(self, obj):
        return obj.stars_given.count() if hasattr(obj, "stars_given") else 0

    def get_starred_count(self, obj):
        return obj.stars_received.count() if hasattr(obj, "stars_received") else 0

class PublicProfileSerializer(serializers.ModelSerializer):
    stars_count = serializers.SerializerMethodField()
    starred_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "avatar", "bio", "creator_type",
            "stars_count", "starred_count",
        ]

    def get_stars_count(self, obj):
        return obj.stars_given.count() if hasattr(obj, "stars_given") else 0

    def get_starred_count(self, obj):
        return obj.stars_received.count() if hasattr(obj, "stars_received") else 0

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'avatar', 'bio']

class MiniUserSerializer(serializers.ModelSerializer):
    is_starred_by_user = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "avatar",
            "is_starred_by_user",
        ]

    def get_is_starred_by_user(self, obj):
        request = self.context.get("request")

        if (
            not request or
            not request.user.is_authenticated
        ):
            return False

        return Star.objects.filter(
            star=request.user,
            starred_user=obj
        ).exists()

class DiscoveryUserSerializer(serializers.ModelSerializer):
    stars_received_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'bio', 'creator_type', 'stars_received_count']

    def get_stars_received_count(self, obj):
        return obj.stars_received.count() if hasattr(obj, "stars_received") else 0