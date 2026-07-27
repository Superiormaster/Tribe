from rest_framework import generics, status, permissions, viewsets, serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.http import JsonResponse
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from django.http import JsonResponse
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.core.cache import cache
import logging
from post.models import Post, Repost
from itertools import chain
from operator import attrgetter
from notifications.services import create_notification
from notifications.serializers import NotificationSerializer
from django.core.cache import cache
from django.contrib.auth import get_user_model
from .status import set_user_online, set_user_offline, get_presence_receivers, get_user_status
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import (
    urlsafe_base64_encode,
    urlsafe_base64_decode
)
from rest_framework.pagination import PageNumberPagination
from rest_framework.authtoken.models import Token
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import json, uuid
from hashlib import sha256
from .ip_address import get_location
from django.contrib.auth import login
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
import requests, uuid
from post.models import Post, Like
from feedback.models import Report
from post.serializers import PostSerializer
from django.utils.encoding import force_bytes
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from sib_api_v3_sdk import ApiClient, Configuration
from sib_api_v3_sdk.api import transactional_emails_api
from sib_api_v3_sdk.models import SendSmtpEmail
from users.email_service import *
from .models import Star, ConnectionRequest, UserDevice, SavedLoginDevice, PrivacySettings, BlockedUser, MutedUser
from .utils import redis_client
from django.db.models import Count, Exists, OuterRef, F
from django.conf import settings
from math import radians, sin, cos, sqrt, atan2

from .serializers import RegisterSerializer, ProfileSerializer, GoogleAuthSerializer, CustomTokenObtainPairSerializer, PublicProfileSerializer, MiniUserSerializer, PrivacySettingsSerializer, MutedUserSerializer, BlockedUserSerializer, ChangePasswordSerializer
from communities.models import Tribe, CommunityMembership, Community, CommunityJoinRequest, CommunityBan
from communities.serializers import TribeDetailSerializer

User = get_user_model()
logger = logging.getLogger(__name__)

class ConnectedUsersPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

def get_block_filters(user):
    muted_ids = user.muted_users.values_list(
        "muted_user_id",
        flat=True
    )

    blocked_ids = user.blocked_users.values_list(
        "blocked_user_id",
        flat=True
    )

    blocked_me_ids = BlockedUser.objects.filter(
        blocked_user=user
    ).values_list(
        "user_id",
        flat=True
    )

    return muted_ids, blocked_ids, blocked_me_ids

def distance(lat1, lon1, lat2, lon2):
    R = 6371  # km

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c

def issue_tokens(user, response=None):
    refresh = RefreshToken.for_user(user)

    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    return {
        "access": access_token,
         "refresh": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "onboarding_step": user.onboarding_step,
        }
    }

def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")

    print("X_FORWARDED_FOR:", request.META.get("HTTP_X_FORWARDED_FOR"))
    print("REMOTE_ADDR:", request.META.get("REMOTE_ADDR"))
    return ip

def update_user_location(request, user):
    ip = get_client_ip(request)

    user.last_login_ip = ip

    lat, lon, city, country = get_location(ip)

    if lat is not None and lon is not None:
        user.latitude = lat
        user.longitude = lon
        user.save(
            update_fields=[
                "latitude",
                "longitude",
                "last_login_ip",
            ]
        )

    location = "Unknown"

    if city and country:
        location = f"{city}, {country}"
    elif country:
        location = country

    return ip, location

def can_view_profile(viewer, profile_user):

    settings, _ = PrivacySettings.objects.get_or_create(
        user=profile_user
    )

    if viewer == profile_user:
        return True

    if settings.profile_visibility == "public":
        return True

    if settings.profile_visibility == "members":
        return viewer.is_authenticated

    if settings.profile_visibility == "private":
        return ConnectionRequest.objects.filter(
            from_user=viewer,
            to_user=profile_user,
            status="accepted"
        ).exists()

    return False

def enforce_profile_visibility(viewer, profile_user):
    if not can_view_profile(viewer, profile_user):
        return Response(
            {
                "detail": "Profile is private",
                "code": "private_profile"
            },
            status=403
        )
    return None

def create_session(user, request, refresh_token):

    fingerprint = request.headers.get("X-Device-Fingerprint")

    if not fingerprint:
        fingerprint = request.META.get("HTTP_USER_AGENT", "")

    session, created = SavedLoginDevice.objects.update_or_create(
        user=user,
        device_id=fingerprint,
        defaults={
            "session_id": str(uuid.uuid4()),
            "refresh_token_hash": sha256(refresh_token.encode()).hexdigest(),
            "device_fingerprint": fingerprint,
            "ip_address": get_client_ip(request),
            "device_name": request.META.get("HTTP_USER_AGENT", "")[:120],
            "is_active": True,
            "last_used": timezone.now(),
        },
    )

    return session, created

class ProfilePostPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"

class GoogleLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    @method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True))
    def post(self, request):
        print("1. Request received")
        token = request.data.get("token")
        print("2. Token:", bool(token))
        if not token:
            return Response({"error": "Missing Google token"}, status=400)

        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
            print("3. Google token verified")
        except Exception as e:
          import traceback
          traceback.print_exc()
          print(e)
          return Response({"error": str(e)}, status=400)

        email = idinfo.get("email")
        if not email:
            return Response({"error": "Login failed"}, status=400)

        username_base = email.split("@")[0]
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={"username": f"{username_base}_{uuid.uuid4().hex[:6]}", "email_verified": True}
        )
        print("4. User:", user.email)

        ip, location = update_user_location(request, user)
        print("5. Location updated")
        response = Response()

        data = issue_tokens(user)
        print("6. JWT created")
        
        # 🔥 CREATE SESSION HERE
        session, is_new_device = create_session(user, request, data["refresh"])
        print("7. Session created")

        if is_new_device:
          send_login_alert_email(
            email=user.email,
            device=request.META.get("HTTP_USER_AGENT", "Unknown Device"),
            location=location,
            ip_address=ip,
            login_time=timezone.localtime().strftime("%d %b %Y %I:%M %p"),
            reset_password_link=f"{settings.FRONTEND_URL}/auth/forgot-password",
          )
          print("8. Sending login alert")
        
        response.data = data
        print("9. Returning response")
        return response

# -----------------------------
# NORMAL LOGIN
# -----------------------------
class NormalLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    authentication_classes = [] 

    @method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True))
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, email=email, password=password)

        if not user:
            return Response({"error": "Invalid credentials"}, status=401)

        ip, location = update_user_location(request, user)
        response = Response()

        data = issue_tokens(user)
        
        # 🔥 CREATE SESSION HERE
        session, is_new_device = create_session(user, request, data["refresh"])

        if is_new_device:
          send_login_alert_email(
            email=user.email,
            device=request.META.get("HTTP_USER_AGENT", "Unknown Device"),
            location=location,
            ip_address=ip,
            login_time=timezone.localtime().strftime("%d %b %Y %I:%M %p"),
            reset_password_link=f"{settings.FRONTEND_URL}/auth/forgot-password",
          )
        
        response.data = data
        return response

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    old_password = serializer.validated_data["old_password"]
    new_password = serializer.validated_data["new_password"]

    # check old password
    if not user.check_password(old_password):
        return Response(
            {"error": "Old password is incorrect"},
            status=400
        )

    user.set_password(new_password)
    user.save()
  
    reset_link = f"{settings.FRONTEND_URL}/auth/forgot-password"

    send_password_changed_email(
      email=user.email,
      reset_password_link=reset_link,
    )

    return Response({"message": "Password changed successfully"})

class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response({"error": "Missing refresh"}, status=401)

        try:
            refresh = RefreshToken(refresh_token)

            user_id = refresh["user_id"]
            user = User.objects.get(id=user_id)

            new_refresh = RefreshToken.for_user(user)

            return Response({
                "access": str(new_refresh.access_token),
                "refresh": str(new_refresh)
            })

        except Exception:
            return Response({"error": "Invalid refresh"}, status=401)

# -----------------------------
# REGISTER
# -----------------------------
@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='dispatch')
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        user = serializer.save()

        verification_url = (
          f"{settings.FRONTEND_URL}/auth/verify-email"
          f"?code={user.verification_code}&email={user.email}"
        )
        
        send_verification_email(
          email=user.email,
          verification_link=verification_url,
        )

        return Response({"message": "Check your email to verify your account"}, status=201)


# -----------------------------
# EMAIL VERIFICATION
# -----------------------------
class VerifyEmailView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")

        if not code:
            return Response(
                {"error": "Invalid verification link"},
                status=400
            )

        try:
            user = User.objects.get(
                verification_code=code
            )

            user.email_verified = True
            user.verification_code = ""
            user.save()

            send_welcome_email(user.email)

            data = issue_tokens(user)

            return Response(data)

        except User.DoesNotExist:
            return Response(
                {"error": "Verification link has expired."},
                status=400
            )


# -----------------------------
# FORGOT PASSWORD
# -----------------------------
class ForgotPasswordView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key='ip', rate='3/m', method='POST', block=True))
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)

        try:
            user = User.objects.get(email=email)
            token = PasswordResetTokenGenerator().make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?uid={uid}&token={token}"
            send_reset_email(
              email=user.email,
              reset_link=reset_url,
            )
        except User.DoesNotExist:
            pass

        return Response({"message": "If this email is registered, a reset link has been sent."})


# -----------------------------
# RESET PASSWORD
# -----------------------------
class ResetPasswordView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")

        if not uidb64 or not token or not password:
            return Response({"error": "Missing parameters"}, status=400)

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except Exception:
            return Response({"error": "Invalid link"}, status=400)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({"error": "Token expired or invalid"}, status=400)

        user.set_password(password)
        user.save()
        reset_link = f"{settings.FRONTEND_URL}/auth/forgot-password"

        send_password_changed_email(
          email=user.email,
          reset_password_link=reset_link,
        )
        return Response({"message": "Password reset successfully"})

# -----------------------------
# MULTI-ACCOUNT LOGOUT
# -----------------------------
class MultiAccountLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        SavedLoginDevice.objects.filter(
            user=request.user
        ).update(is_active=False)

        res = Response({"success": True})
        res.delete_cookie("access")
        res.delete_cookie("refresh", path="/api/")

        return res

@method_decorator(ratelimit(key='ip', rate='3/m', method='POST', block=True), name='dispatch')
class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)

        try:
            user = User.objects.get(email=email)
            if user.email_verified:
                return Response({"message": "Email is already verified."})

            # Regenerate verification code
            user.generate_verification_code()

            verification_url = (
              f"{settings.FRONTEND_URL}/auth/verify-email"
              f"?code={user.verification_code}"
              f"&email={user.email}"
            )
            
            send_verification_email(
              email=user.email,
              verification_link=verification_url,
            )

            return Response({"message": "Verification link sent successfully."})
        except User.DoesNotExist:
            return Response({"error": "Email not found."}, status=404)

def get_relationship(request_user, target_user):
    if request_user == target_user:
        return {
            "is_me": True,
            "is_star": False,
            "is_connected": False,
            "request_pending": False
        }

    # STAR
    is_star = Star.objects.filter(
        star=request_user,
        starred_user=target_user
    ).exists()

    # CONNECTION REQUEST
    pending_sent = ConnectionRequest.objects.filter(
        from_user=request_user,
        to_user=target_user,
        status="pending"
    ).exists()

    pending_received = ConnectionRequest.objects.filter(
        from_user=target_user,
        to_user=request_user,
        status="pending"
    ).exists()

    # ACCEPTED CONNECTION (chat allowed)
    is_connected = ConnectionRequest.objects.filter(
        from_user=request_user,
        to_user=target_user,
        status="accepted"
    ).exists() or ConnectionRequest.objects.filter(
        from_user=target_user,
        to_user=request_user,
        status="accepted"
    ).exists()

    return {
        "is_me": False,
        "is_star": is_star,
        "is_connected": is_connected,
        "request_sent": pending_sent,
        "request_received": pending_received
    }

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_view(request, username):

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    muted_ids, blocked_ids, blocked_me_ids = get_block_filters(request.user)

    if user.id in blocked_ids:
        return Response(
            {"error": "User not found"},
            status=404
        )
  
    if user.id in blocked_me_ids:
        return Response(
            {"error": "User not found"},
            status=404
        )

    cache_key = (
        f"profile:{username}:stats:"
        f"{request.user.id}"
    )
    cached = redis_client.get(cache_key)

    relationship = get_relationship(request.user, user)

    if cached:
        data = json.loads(cached)
        data["relationship"] = relationship
        return Response(data)

    posts_count = Post.objects.filter(
        user=user,
        is_deleted=False,
        is_approved=True
    ).count()

    reposts_count = Repost.objects.filter(
        user=user,
        is_deleted=False
    ).count()

    total_posts = posts_count + reposts_count

    privacy_settings = PrivacySettings.objects.filter(user=user).first()

    is_private = (
        privacy_settings.profile_visibility == "private"
        if privacy_settings else False
    )
  
    if request.user == user:
        is_private = False

    cache_payload = {
        "profile": ProfileSerializer(user).data,
        "stats": {
            "posts": total_posts,
            "reposts": reposts_count,
            "stars": user.starred_count if hasattr(user, "starred_count") else 0,
        },
        "is_private": is_private,
    }

    redis_client.setex(
        cache_key,
        300,
        json.dumps(cache_payload, default=str)
    )

    return Response({
        **cache_payload,
        "relationship": relationship
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_posts(request, username):

    page = int(request.query_params.get("page", 1))
    cache_key = (
        f"profile:{username}:feed:"
        f"{request.user.id}:{page}"
    )

    cached = redis_client.get(cache_key)
    if cached:
        return Response(json.loads(cached))

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    muted_ids, blocked_ids, blocked_me_ids = get_block_filters(request.user)

    if user.id in blocked_ids:
        return Response(
            {"error": "User not found"},
            status=404
        )
  
    if user.id in blocked_me_ids:
        return Response(
            {"error": "User not found"},
            status=404
        )
  
    privacy_response = enforce_profile_visibility(
        request.user,
        user
    )
    
    if privacy_response:
        return privacy_response

    posts_qs = Post.objects.filter(
        user=user,
        is_deleted=False,
        is_approved=True
    ).annotate(
        likes_count=Count("likes", distinct=True),
        comments_count=Count("comments", distinct=True),
        is_liked=Exists(
            Like.objects.filter(
                post=OuterRef("pk"),
                user=request.user
            )
        ),
        is_pinned=F("profile_pinned"),
        pin_order=F("profile_pin_order")
    ).select_related("user", "community").prefetch_related("likes", "comments", "shares", "media_files").order_by("-profile_pinned", "profile_pin_order", "-created_at")

    reposts = Repost.objects.filter(
        user=user,
        is_deleted=False
    ).select_related("user", "post", "post__user", "post__community").prefetch_related("post__media_files")

    post_items = [
        {"type": "post", "created_at": p.created_at, "data": p}
        for p in posts_qs
    ]

    repost_items = [
        {"type": "repost", "created_at": r.created_at, "data": r}
        for r in reposts
    ]

    combined = sorted(
        post_items + repost_items,
        key=lambda x: x["created_at"],
        reverse=True
    )

    PAGE_SIZE = 20
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE

    paged = combined[start:end]

    results = []

    for item in paged:

        if item["type"] == "post":
            results.append({
                "type": "post",
                "data": PostSerializer(
                    item["data"],
                    context={"request": request}
                ).data
            })

        else:
            r = item["data"]

            post_obj = Post.objects.filter(id=r.post.id)\
            .select_related("user", "community")\
            .annotate(
                likes_count=Count("likes", distinct=True),
                comments_count=Count("comments", distinct=True),
                shares_count=Count("shares", distinct=True),
                is_liked=Exists(
                    Like.objects.filter(
                        post=OuterRef("pk"),
                        user=request.user
                    )
                )
            ).first()

            results.append({
                "type": "repost",
                "data": {
                    "id": r.id,
                    "created_at": r.created_at,
                    "repost_type": r.repost_type,
                    "quote_text": r.quote_text,
                    "user": MiniUserSerializer(r.user, context={"request": request}).data,
                    "post": PostSerializer(post_obj, context={"request": request}).data
                }
            })

    response = {
        "results": results,
        "next": f"?page={page + 1}" if len(combined) > end else None,
        "previous": page - 1 if page > 1 else None
    }

    redis_client.setex(
        cache_key,
        60,
        json.dumps(response, default=str)
    )

    return Response(response)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def connect_user(request, user_id):
    user = request.user
    target = User.objects.get(id=user_id)

    # prevent duplicates
    obj, created = ConnectionRequest.objects.get_or_create(
        from_user=user,
        to_user=target,
        defaults={"status": "pending"}
    )

    if created:

        notif = create_notification(
            type="connection_request",
            recipient=target,
            actors=[user],
            post=None,
            community=None
        )

    return Response({
        "status": "request_sent" if created else "already_exists"
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_connection(request, user_id):
    user = request.user
    target = User.objects.get(id=user_id)

    ConnectionRequest.objects.filter(
        from_user=user,
        to_user=target
    ).delete()

    ConnectionRequest.objects.filter(
        from_user=target,
        to_user=user
    ).delete()

    return Response({"status": "removed"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_connection(request, user_id):
    user = request.user

    ConnectionRequest.objects.filter(
        from_user=user,
        to_user_id=user_id,
        status="pending"
    ).delete()

    return Response({"status": "cancelled"})

def get_connected_users(user):
    sent = ConnectionRequest.objects.filter(
        from_user=user,
        status="accepted"
    ).values_list("to_user", flat=True)

    received = ConnectionRequest.objects.filter(
        to_user=user,
        status="accepted"
    ).values_list("from_user", flat=True)

    return User.objects.filter(id__in=list(sent) + list(received))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def connected_users(request):
    user = request.user

    muted_ids, blocked_ids, blocked_me_ids = get_block_filters(user)

    connections = (
        get_connected_users(user)
        .exclude(id__in=muted_ids)
        .exclude(id__in=blocked_ids)
        .exclude(id__in=blocked_me_ids)
        .order_by("username")
    )

    paginator = ConnectedUsersPagination()
    page = paginator.paginate_queryset(
        connections,
        request
    )

    data = [
        {
            "id": u.id,
            "username": u.username,
            "avatar": u.avatar if u.avatar else None,
            "bio": u.bio,
        }
        for u in page
    ]

    return paginator.get_paginated_response(
        data
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def discover_people(request):
    user = request.user

    # =========================
    # EXCLUSIONS
    # =========================
    muted_ids, blocked_ids, blocked_me_ids = get_block_filters(user)
  
    connected_ids = get_connected_users(user).values_list("id", flat=True)

    pending_sent_ids = ConnectionRequest.objects.filter(
      from_user=user,
      status="pending"
    ).values_list("to_user_id", flat=True)
  
    excluded_ids = set(
      list(connected_ids) +
      list(pending_sent_ids) +
      [user.id]
    )

    # =========================
    # BASE QUERYSET
    # =========================
    users = User.objects.exclude(
        id__in=excluded_ids
    ).exclude(
        id__in=muted_ids
    ).exclude(
        id__in=blocked_ids
    ).exclude(
        id__in=blocked_me_ids
    ).annotate(

        # popularity
        stars_received_count=Count('starred_by'),

        # already starred
        is_starred=Exists(
            Star.objects.filter(
                star=user,
                starred_user=OuterRef('pk')
            )
        )
    )

    # =========================
    # OPTIONAL FILTERS
    # =========================
    country = request.query_params.get("country")

    if country:
        users = users.filter(
            country__iexact=country
        )
    
    joined_communities = CommunityMembership.objects.filter(
      user=user
    ).values_list("community_id", flat=True)
  
    users = users.annotate(
      mutual_communities_count=Count(
          "communitymembership",
          filter=Q(
              communitymembership__community_id__in=joined_communities
          ),
          distinct=True,
      )
    )

    # =========================
    # SERIALIZE
    # =========================
    results = []

    for u in users:

        # -------------------------
        # RELATIONSHIP
        # -------------------------
        rel = get_relationship(user, u)

        # -------------------------
        # DISTANCE
        # -------------------------
        distance_km = None
        user_type = "suggested"

        if (
            user.latitude and
            user.longitude and
            u.latitude and
            u.longitude
        ):

            distance_km = round(
                distance(
                    user.latitude,
                    user.longitude,
                    u.latitude,
                    u.longitude
                ),
                2
            )

            if distance_km <= 5:
                user_type = "nearby"

        same_country = (
          user.country
          and u.country
          and user.country.lower() == u.country.lower()
        )

        # -------------------------
        # SERIALIZE
        # -------------------------
        results.append({
            "id": u.id,
            "username": u.username,
            "avatar": (
                u.avatar.url
                if hasattr(u.avatar, "url")
                else u.avatar
            ) if u.avatar else None,
            "bio": u.bio,
            "country": u.country,
            "sameCountry": same_country,
            "mutualCommunities": u.mutual_communities_count,
            "distance": distance_km,
            "type": user_type,
            "stars_count": u.stars_received_count,
            # star system
            "starred": u.is_starred,
            # connect system
            "connected": rel["is_connected"],
            "requestPending": rel["request_sent"],
            "requestReceived": rel["request_received"],
        })

    # =========================
    # SORTING PRIORITY
    # =========================
    results.sort(
      key=lambda x: (
          x["type"] != "nearby",
          -x["mutualCommunities"],
          -x["stars_count"],
          not x["sameCountry"],
      )
    )

    # =========================
    # LIMIT TO 15
    # =========================
    return Response(results[:15])

class NearbyPagination(PageNumberPagination):
    page_size = 20

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def discover_connect(request):
    user = request.user

    if not user.latitude or not user.longitude:
        return Response([])

    # =========================
    # EXCLUSIONS
    # =========================
    muted_ids, blocked_ids, blocked_me_ids = get_block_filters(user)

    connected_ids = ConnectionRequest.objects.filter(
        from_user=user,
        status="accepted"
    ).values_list("to_user_id", flat=True)

    connected_ids2 = ConnectionRequest.objects.filter(
        to_user=user,
        status="accepted"
    ).values_list("from_user_id", flat=True)

    pending_ids = ConnectionRequest.objects.filter(
        from_user=user,
        status="pending"
    ).values_list("to_user_id", flat=True)

    excluded_ids = set(
        list(connected_ids) +
        list(connected_ids2) +
        list(pending_ids) +
        [user.id]
    )

    # =========================
    # FILTER USERS ON DB LEVEL
    # =========================
    users = User.objects.exclude(
        id__in=excluded_ids
    ).exclude(
        id__in=muted_ids
    ).exclude(
        id__in=blocked_ids
    ).exclude(
        id__in=blocked_me_ids
    ).exclude(
        latitude=None
    )

    # Convert once → avoid queryset surprises
    users = list(users)

    # =========================
    # HELPER
    # =========================
    def get_avatar(u):
        if not u.avatar:
            return None
        return u.avatar.url if hasattr(u.avatar, "url") else u.avatar

    # =========================
    # NEARBY
    # =========================
    nearby = []

    for u in users:
        if not u.latitude or not u.longitude:
            continue

        dist = distance(
            user.latitude,
            user.longitude,
            u.latitude,
            u.longitude
        )

        if dist < 5:
            rel = get_relationship(user, u)

            nearby.append({
                "id": u.id,
                "username": u.username,
                "avatar": get_avatar(u),
                "bio": u.bio,
                "distance": round(dist, 2),
                "connected": rel["is_connected"],
                "requestPending": rel["request_sent"],
                "requestReceived": rel["request_received"],
            })

    # =========================
    # FALLBACK (FIXED)
    # =========================
    if not nearby:
        fallback = []

        for u in users:  # ✅ already filtered users
            rel = get_relationship(user, u)

            fallback.append({
                "id": u.id,
                "username": u.username,
                "avatar": get_avatar(u),
                "bio": u.bio,
                "distance": None,
                "connected": rel["is_connected"],
                "requestPending": rel["request_sent"],
                "requestReceived": rel["request_received"],
            })

        return Response(fallback)

    paginator = NearbyPagination()
    page = paginator.paginate_queryset(
        nearby,
        request
    )
    
    return paginator.get_paginated_response(page)

class RequestsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sent_requests(request):
    user = request.user

    requests = (
        ConnectionRequest.objects.filter(
            from_user=user,
            status="pending"
        )
        .select_related("to_user")
    )

    muted_ids, blocked_ids, blocked_me_ids = get_block_filters(user)

    requests = requests.exclude(
        to_user_id__in=blocked_ids
    ).exclude(
        to_user_id__in=blocked_me_ids
    )

    paginator = RequestsPagination()
    page = paginator.paginate_queryset(
        requests,
        request
    )

    data = [
        {
            "id": r.to_user.id,
            "username": r.to_user.username,
            "avatar": (
                r.to_user.avatar.url
                if hasattr(r.to_user.avatar, "url")
                else r.to_user.avatar
            ) if r.to_user.avatar else None,
            "bio": r.to_user.bio,
        }
        for r in page
    ]

    return paginator.get_paginated_response(
        data
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_requests(request):
    user = request.user

    requests = (
        ConnectionRequest.objects.filter(
            to_user=user,
            status="pending"
        )
        .select_related("from_user")
    )

    muted_ids, blocked_ids, blocked_me_ids = get_block_filters(user)

    requests = requests.exclude(
        from_user_id__in=blocked_ids
    ).exclude(
        from_user_id__in=blocked_me_ids
    )

    paginator = RequestsPagination()
    page = paginator.paginate_queryset(
        requests,
        request
    )

    data = [
        {
            "id": r.from_user.id,
            "username": r.from_user.username,
            "avatar": (
                r.from_user.avatar.url
                if hasattr(r.from_user.avatar, "url")
                else r.from_user.avatar
            ) if r.from_user.avatar else None,
            "bio": r.from_user.bio,
        }
        for r in page
    ]

    return paginator.get_paginated_response(
        data
    )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_connection(request, user_id):
    user = request.user
    target = User.objects.get(id=user_id)

    try:
        conn = ConnectionRequest.objects.get(
            from_user=target,
            to_user=user,
            status="pending"
        )
        conn.status = "accepted"
        conn.save()

        notif = create_notification(
            type="connection_accept",
            recipient=target,
            actors=[user]
        )

        return Response({"status": "accepted"})

    except ConnectionRequest.DoesNotExist:
        return Response({"error": "Request not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decline_connection(request, user_id):
    user = request.user
    target = User.objects.get(id=user_id)

    deleted_count, _ = ConnectionRequest.objects.filter(
        from_user=target,
        to_user=user,
        status="pending"
    ).delete()

    # ONLY notify if something was actually declined
    if deleted_count > 0:

        create_notification(
            type="connection_declined",
            recipient=target,
            actors=[user]
        )

    return Response({"status": "declined"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_onboarding(request):
    user = request.user
    user.onboarding_step = 3
    user.save()
    return Response({"message": "Onboarding complete"})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def onboarding_status(request):
    user = request.user

    profile_completed = all([
        user.full_name,
        user.username,
        user.email,
        user.bio,
        user.country,
        user.gender,
    ])

    discover_completed = CommunityMembership.objects.filter(
      user=user
    ).exists()

    star_completed = user.onboarding_step >= 3

    return Response({
        "profileCompleted": profile_completed,
        "discoverCompleted": discover_completed,
        "starCompleted": star_completed,
        "completed": (
            profile_completed and
            discover_completed and
            star_completed
        ),
    })

class StarViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def my_stars(self, request):
        stars = Star.objects.filter(star=request.user).select_related("starred_user").distinct()

        data = [
            {
                "id": s.starred_user.id,
                "username": s.starred_user.username,
                "avatar": getattr(s.starred_user, "avatar", ""),
            }
            for s in stars
        ]
        return Response(data)

    @action(detail=False, methods=["get"])
    def starred_me(self, request):
        stars = Star.objects.filter(starred_user=request.user).select_related("star").distinct()
    
        data = [
            {
                "id": s.star.id,
                "username": s.star.username,
                "avatar": getattr(s.star, "avatar", ""),
            }
            for s in stars
        ]
        return Response(data)

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        user = request.user
    
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
    
        if target_user == user:
            return Response({"error": "You cannot star yourself"}, status=400)
    
        star, created = Star.objects.get_or_create(
            star=user,
            starred_user=target_user
        )
    
        # IF ALREADY EXISTS → UNSTAR
        if not created:
            star.delete()
    
            cache.delete(f"starred:{user.id}")
    
            return Response({"starred": False})
    
        # NEW STAR → CREATE NOTIFICATION
        create_notification(
            type="star",
            recipient=star.starred_user,
            actors=[star.star]
        )
    
        cache.delete(f"starred:{user.id}")
    
        user.onboarding_step = max(user.onboarding_step, 3)
        user.save(update_fields=["onboarding_step"])
    
        return Response({
          "starred": True,
          "target_user_id": target_user.id
      })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_starred_users(request):
    user = request.user
    cache_key = f"starred:{user.id}"

    # ✅ 1. Try cache first
    cached = cache.get(cache_key)
    if cached is not None:
        return Response({"starred_users": cached})

    try:
        # ✅ 2. Query DB
        starred_ids = list(
            Star.objects.filter(star=user)
            .values_list("starred_user_id", flat=True)
        )

        # ✅ 3. Store in cache (5m)
        cache.set(cache_key, starred_ids, 300)

        return Response({"starred_users": starred_ids})

    except Exception as e:
        logger.error(f"get_starred_users failed: {e}")
        return Response({"starred_users": []})

# -----------------------------
# PROFILE
# -----------------------------
class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if not can_view_profile(request.user, user):
            return Response(
                {"detail": "This profile is private"},
                status=403
            )

        serializer = ProfileSerializer(user)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        user = request.user   # ✅ FIX
    
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    
        return Response(serializer.data)

        # STEP 1 COMPLETED
        user.onboarding_step = max(user.onboarding_step, 1)
        user.save(update_fields=["onboarding_step"])

        return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def discover_communities(request):
    queryset = (
        Tribe.objects
        .prefetch_related("communities")
        .order_by("name")
    )

    paginator = PageNumberPagination()
    paginator.page_size = 10

    page = paginator.paginate_queryset(queryset, request)

    serializer = TribeDetailSerializer(
        page,
        many=True,
        context={
            "request": request,
            "discover": True,
        },
    )

    return paginator.get_paginated_response(serializer.data)

def join_community(user, community):
    ban = CommunityBan.objects.filter(
        community=community,
        user=user,
    ).first()
  
    if ban and ban.is_active:
        return

    membership = CommunityMembership.objects.filter(
        user=user,
        community=community,
    ).first()

    if membership:
        return

    if community.join_approval_required:
        CommunityJoinRequest.objects.get_or_create(
            community=community,
            user=user,
        )
        
        recipients = {community.owner.id: community.owner}

        staff_members = CommunityMembership.objects.filter(
          community=community,
          role__in=["admin", "moderator"]
        ).exclude(
          user=community.owner
        )

        for member in staff_members:
          recipients[member.user.id] = member.user

        for recipient in recipients.values():
          create_notification(
            type="join_request",
            recipient=recipient,
            actors=[user],
            community=community
          )
        return

    CommunityMembership.objects.create(
        user=user,
        community=community,
        role="owner" if user == community.owner else "member",
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def discover_join(request):
    ids = request.data.get("community_ids", [])

    communities = Community.objects.filter(
        id__in=ids
    )

    for community in communities:
        join_community(
            request.user,
            community,
        )

    request.user.onboarding_step = max(
        request.user.onboarding_step,
        2,
    )
    request.user.save(
        update_fields=["onboarding_step"]
    )

    return Response({
        "success": True
    })

class PublicProfileView(generics.RetrieveAPIView):

    serializer_class = PublicProfileSerializer
    queryset = User.objects.all()
    lookup_field = "username"
    permission_classes = [AllowAny]

# -----------------------------
# PROTECTED TEST ROUTE
# -----------------------------
class ProtectedView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        print("COOKIES:", request.COOKIES)
        print("User:", request.user)

        return Response({
            "message": f"Hello {request.user.username}, you are authenticated."
        })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def socket_auth(request):
    user = request.user

    refresh = RefreshToken.for_user(user)

    return Response({
        "user_id": user.id,
        "username": user.username,
        "avatar": getattr(user, "avatar", None),
        "token": str(refresh.access_token),
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_presence(request, user_id):
    data = get_user_status(user_id)
    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def presence_receivers(request):
    return Response(
        get_presence_receivers(
            request.user
        )
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_online(request):
    set_user_online(request.user.id)

    return Response({
        "status": "online"
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_offline(request):
    set_user_offline(request.user.id)

    return Response(
        get_user_status(
            request.user.id
        )
    )
  
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def heartbeat(request):
    user = request.user

    # live presence
    redis_client.set(
        f"user:{user.id}:status",
        "online",
        ex=30
    )

    return Response({"status": "alive"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def register_device(request):
    user = request.user

    device_id = request.data.get("device_id")
    device_name = request.data.get("device_name")
    public_key = request.data.get("public_key")

    if not all([device_id, public_key]):
        return Response({"error": "missing fields"}, status=400)

    device, _ = UserDevice.objects.update_or_create(
        user=user,
        device_id=device_id,
        defaults={
            "device_name": device_name,
            "public_key": public_key,
            "is_active": True
        }
    )

    return Response({"status": "device registered"})

class RotateDeviceKey(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        device_id = request.data["device_id"]
        new_key = request.data["public_key"]

        UserDevice.objects.filter(
            user=request.user,
            device_id=device_id
        ).update(public_key=new_key)

        return Response({"status": "rotated"})

class DeviceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = SavedLoginDevice.objects.filter(
            user=request.user,
            is_active=True
        )

        return Response([
            {
                "id": s.session_id,
                "device": s.device_name,
                "ip": s.ip_address,
                "last_seen": s.last_used
            }
            for s in sessions
        ])


class RevokeSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")

        SavedLoginDevice.objects.filter(
            user=request.user,
            session_id=session_id
        ).update(is_active=False)

        return Response({"success": True})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_user(request, username):
    try:
        user = User.objects.get(username=username)

    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=404
        )

    report, created = Report.objects.get_or_create(
        reporter=request.user,
        report_type="user",
        target_user=user,
        defaults={
            "reason": request.data.get("reason"),
            "details": request.data.get("details", "")
        }
    )

    if not created:
        return Response(
            {"message": "You already reported this user"},
            status=400
        )

    return Response({
        "success": True,
        "message": "User reported successfully"
    })

class PrivacySettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = PrivacySettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = PrivacySettings.objects.get_or_create(
            user=self.request.user
        )
        return obj

class SmallPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def block_user(request, user_id):
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if target == request.user:
        return Response({"error": "You cannot block yourself"}, status=400)

    obj, created = BlockedUser.objects.get_or_create(
        user=request.user,
        blocked_user=target
    )

    return Response({"success": True, "blocked": True})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unblock_user(request, user_id):
    BlockedUser.objects.filter(
        user=request.user,
        blocked_user_id=user_id
    ).delete()

    return Response({"success": True, "blocked": False})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def blocked_users_list(request):
    search = request.query_params.get("search", "").strip()

    qs = BlockedUser.objects.filter(user=request.user).select_related("blocked_user")

    if search:
        qs = qs.filter(
            Q(blocked_user__username__icontains=search) |
            Q(blocked_user__full_name__icontains=search)
        )

    paginator = SmallPagination()
    page = paginator.paginate_queryset(qs, request)

    serializer = BlockedUserSerializer(page, many=True)

    return paginator.get_paginated_response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mute_user(request, user_id):
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if target == request.user:
        return Response({"error": "You cannot mute yourself"}, status=400)

    obj, created = MutedUser.objects.get_or_create(
        user=request.user,
        muted_user=target
    )

    return Response({"success": True, "muted": True})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unmute_user(request, user_id):
    MutedUser.objects.filter(
        user=request.user,
        muted_user_id=user_id
    ).delete()

    return Response({"success": True, "muted": False})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def muted_users_list(request):
    search = request.query_params.get("search", "").strip()

    qs = MutedUser.objects.filter(user=request.user).select_related("muted_user")

    if search:
        qs = qs.filter(
            Q(muted_user__username__icontains=search) |
            Q(muted_user__full_name__icontains=search)
        )

    paginator = SmallPagination()
    page = paginator.paginate_queryset(qs, request)

    serializer = MutedUserSerializer(page, many=True)

    return paginator.get_paginated_response(serializer.data)

@api_view(["GET"])
@permission_classes([AllowAny])
def ping(request):
    return JsonResponse({
        "status": "ok"
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_fcm_token(request):
    request.user.fcm_token = request.data.get("token")
    request.user.save(update_fields=["fcm_token"])
    return Response({"success": True})