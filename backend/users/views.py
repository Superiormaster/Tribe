from rest_framework import generics, status, permissions, viewsets, serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
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
from .status import set_user_online, set_user_offline
from rest_framework.exceptions import AuthenticationFailed
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
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
from post.serializers import PostSerializer
from django.utils.encoding import force_bytes
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from sib_api_v3_sdk import ApiClient, Configuration
from sib_api_v3_sdk.api import transactional_emails_api
from sib_api_v3_sdk.models import SendSmtpEmail
from users.email import send_brevo_email
from .models import Star, ConnectionRequest, UserDevice, SavedLoginDevice
from .utils import redis_client
from django.db.models import Count, Exists, OuterRef, F
from django.conf import settings
from math import radians, sin, cos, sqrt, atan2

from .serializers import RegisterSerializer, ProfileSerializer, GoogleAuthSerializer, CustomTokenObtainPairSerializer, PublicProfileSerializer, MiniUserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)

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

def send_verification_email(email, verification_link):
    html_content = f"""
<html>
  <body style="font-family:Arial,sans-serif; background:#f6f6f6; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border-radius:8px;">
      <div style="text-align:center; margin-bottom:20px;">
        <img src="https://yourdomain.com/logo.png" alt="Tribe Logo" width="120" />
      </div>
      <h2 style="color:#333;">Verify your Tribe account</h2>
      <p>Hi,</p>
      <p>Click below to verify your Tribe account:</p>
      <p style="text-align:center; margin:30px 0;">
        <a href="{verification_link}" style="background:#4f46e5; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Verify Email</a>
      </p>
      <p>If you didn't signup, you can safely ignore this email.</p>
      <hr style="margin:20px 0; border-color:#ddd;">
        <a href="https://yourdomain.com/unsubscribe" style="color:#888;">Unsubscribe</a>
      </p>
    </div>
  </body>
</html>
"""
    send_brevo_email(
      user.email,
      "Verify your Tribe Email",
      html_content,
      text_content=f"Click here to verify: {verification_link}"
    )

def send_reset_email(email, reset_link):
    text_content = f"""
Hi,

You requested a password reset for your Tribe account.
Click this link to reset your password:

{reset_link}

If you didn’t request this, you can ignore this email.

— Tribe Team
"""

    html_content = f"""
<html>
  <body style="font-family:Arial,sans-serif; background:#f6f6f6; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border-radius:8px;">
      <div style="text-align:center; margin-bottom:20px;">
        <img src="https://yourdomain.com/logo.png" alt="Tribe Logo" width="120" />
      </div>
      <h2 style="color:#333;">Reset Your Password</h2>
      <p>Hi,</p>
      <p>You requested a password reset for your Tribe account. Click the button below to reset your password:</p>
      <p style="text-align:center; margin:30px 0;">
        <a href="{reset_link}" style="background:#4f46e5; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Reset Password</a>
      </p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <hr style="margin:20px 0; border-color:#ddd;">
      <p style="font-size:12px; color:#888; text-align:center;">
        You received this email because you have an account with Tribe.<br/>
        <a href="https://yourdomain.com/unsubscribe" style="color:#888;">Unsubscribe</a>
      </p>
    </div>
  </body>
</html>
"""

    send_brevo_email(
        email,
        "Reset Your Tribe Password",
        html_content,
        text_content=f"Reset your password using this link: {reset_link}"
    )

def update_user_location(request, user):
    ip = request.META.get('HTTP_X_FORWARDED_FOR')
    if ip:
        ip = ip.split(",")[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')

    user.last_login_ip = ip
    lat, lon = get_location(ip)

    if lat is not None and lon is not None:
        user.latitude = lat
        user.longitude = lon
        user.save(update_fields=["latitude", "longitude", "last_login_ip"])

def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip

def create_session(user, request, refresh_token):
    fingerprint = request.headers.get("X-Device-Fingerprint")
    device_id = request.META.get("HTTP_USER_AGENT", "") + str(request.META.get("REMOTE_ADDR"))

    session, _ = SavedLoginDevice.objects.update_or_create(
        user=user,
        device_id=device_id,  # ✅ THIS is your lookup
        defaults={
            "session_id": str(uuid.uuid4()),
            "refresh_token_hash": sha256(refresh_token.encode()).hexdigest(),
            "device_fingerprint": fingerprint,
            "ip_address": get_client_ip(request),
            "device_name": request.META.get("HTTP_USER_AGENT", "")[:120],
            "is_active": True,
            "last_used": timezone.now(),
        }
    )

    return session

class ProfilePostPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"

class GoogleLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    @method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True))
    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"error": "Missing Google token"}, status=400)

        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
        except ValueError:
            return Response({"error": "Invalid Google token"}, status=400)

        email = idinfo.get("email")
        if not email:
            return Response({"error": "Login failed"}, status=400)

        username_base = email.split("@")[0]
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={"username": f"{username_base}_{uuid.uuid4().hex[:6]}", "email_verified": True}
        )

        update_user_location(request, user)
        response = Response()

        data = issue_tokens(user)
        
        # 🔥 CREATE SESSION HERE
        create_session(user, request, data["refresh"])
        
        response.data = data
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

        update_user_location(request, user)
        response = Response()

        data = issue_tokens(user)
        
        # 🔥 CREATE SESSION HERE
        create_session(user, request, data["refresh"])
        
        response.data = data
        return response

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
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        verification_url = f"{settings.FRONTEND_URL}/auth/verify-email?code={user.verification_code}"
        send_verification_email(user.email, verification_url)

        return Response({"message": "Check your email to verify your account"}, status=201)


# -----------------------------
# EMAIL VERIFICATION
# -----------------------------
class VerifyEmailView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        if not code:
            return Response({"error": "Invalid verification link"}, status=400)
        try:
            user = User.objects.get(verification_code=code)
            user.email_verified = True
            user.verification_code = ""
            user.save()

            res = Response({"message": "Email verified successfully!"})
            return set_cookie_account(res, user)

        except User.DoesNotExist:
            return Response({"error": "Invalid verification code"}, status=400)


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
            send_reset_email(user.email, reset_url)
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
        res = Response({"message": "Password reset successfully"})
        return set_cookie_account(res, user)

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

            verification_url = f"{settings.FRONTEND_URL}/auth/verify-email?code={user.verification_code}"

            html_content = f"""
<html>
  <body style="font-family:Arial,sans-serif; background:#f6f6f6; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border-radius:8px;">
      <div style="text-align:center; margin-bottom:20px;">
        <img src="https://yourdomain.com/logo.png" alt="Tribe Logo" width="120" />
      </div>
      <h2 style="color:#333;">Verify your Tribe account</h2>
      <p>Hi,</p>
      <p>Click below to verify your Tribe account:</p>
      <p style="text-align:center; margin:30px 0;">
        <a href="{verification_url}" style="background:#4f46e5; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Verify Email</a>
      </p>
      <p>If you didn't signup, you can safely ignore this email.</p>
      <hr style="margin:20px 0; border-color:#ddd;">
        <a href="https://yourdomain.com/unsubscribe" style="color:#888;">Unsubscribe</a>
      </p>
    </div>
  </body>
</html>
"""

            send_brevo_email(user.email, "Verify your Tribe Email", html_content)

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

    cache_key = f"profile:{username}:stats"
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

    cache_payload = {
        "profile": ProfileSerializer(user).data,
        "stats": {
            "posts": total_posts,
            "reposts": reposts_count,
            "stars": user.starred_count if hasattr(user, "starred_count") else 0,
        }
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
    cache_key = f"profile:{username}:feed:{page}"

    cached = redis_client.get(cache_key)
    if cached:
        return Response(json.loads(cached))

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

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
        "next": page + 1 if len(combined) > end else None,
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

    connections = get_connected_users(user)

    data = [
        {
            "id": u.id,
            "username": u.username,
            "avatar": u.avatar if u.avatar else None,
            "bio": u.bio
        }
        for u in connections
    ]

    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def discover_people(request):
    user = request.user

    # =========================
    # EXCLUSIONS
    # =========================
    excluded_ids = [user.id]

    # =========================
    # BASE QUERYSET
    # =========================
    users = User.objects.exclude(
        id__in=excluded_ids
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
    interest = request.query_params.get("interest")
    country = request.query_params.get("country")

    if interest:
        users = users.filter(
            interests__icontains=interest
        )

    if country:
        users = users.filter(
            country__iexact=country
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

        # -------------------------
        # MUTUAL INTERESTS
        # -------------------------
        mutual_interests = []

        if user.interests and u.interests:

            mutual_interests = list(
                set(user.interests).intersection(
                    set(u.interests)
                )
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

            "interests": u.interests,

            "mutual_interests": mutual_interests,

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
            -(len(x["mutual_interests"])),
            -(x["stars_count"])
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
    users = User.objects.exclude(id__in=excluded_ids).exclude(latitude=None)

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sent_requests(request):
    user = request.user

    requests = ConnectionRequest.objects.filter(
        from_user=user,
        status="pending"
    ).select_related("to_user")

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
        for r in requests
    ]

    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_requests(request):
    user = request.user

    requests = ConnectionRequest.objects.filter(
        to_user=user,
        status="pending"
    ).select_related("from_user")

    data = [
        {
            "id": r.from_user.id,
            "username": r.from_user.username,
            "avatar": (
                r.to_user.avatar.url
                if hasattr(r.to_user.avatar, "url")
                else r.to_user.avatar
            ) if r.to_user.avatar else None,
            "bio": r.from_user.bio,
        }
        for r in requests
    ]

    return Response(data)

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_status(request):
    user = request.user

    return Response({
        "profileCompleted": user.onboarding_step >= 1,
        "interestsCompleted": user.onboarding_step >= 2,
        "starCompleted": user.onboarding_step >= 3,
        "completed": user.onboarding_step >= 3, 
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def discover_creators(request):
    user = request.user
    interests = user.interests or []

    # Base queryset: all creators except current user
    creators_qs = User.objects.filter(is_creator=True).exclude(id=user.id)

    # Creators matching user's interests
    interest_creators = creators_qs.filter(interests__overlap=interests)

    # Creators the user has starred
    starred_creators_ids = Star.objects.filter(follower=user).values_list('following_id', flat=True)
    starred_creators = creators_qs.filter(id__in=starred_creators_ids)

    # Popular creators by stars received
    popular_creators = creators_qs.annotate(star_count=Count('starred_by')).order_by('-star_count')

    # Combine all three querysets and remove duplicates
    combined_creators = (interest_creators | starred_creators | popular_creators).distinct()[:20]

    # Build response
    data = [
        {
            "id": c.id,
            "username": c.username,
            "avatar": request.build_absolute_uri(c.avatar.url) if c.avatar else None,
            "bio": c.bio,
            "stars_count": c.starred_by.count() if hasattr(c, 'starred_by') else 0
        }
        for c in combined_creators
    ]

    return Response(data)

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

        if not created:
            star.delete()
        
            cache.delete(f"starred:{user.id}")
        
            return Response({"starred": False})
        
        cache.delete(f"starred:{user.id}")

        user.onboarding_step = max(user.onboarding_step, 3)
        user.save(update_fields=["onboarding_step"])
    
        return Response({"starred": True})

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

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        user = self.get_object()

        serializer = self.get_serializer(
            user,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        # STEP 1 COMPLETED
        user.onboarding_step = max(user.onboarding_step, 1)
        user.save(update_fields=["onboarding_step"])

        return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def save_interests(request):
    user = request.user

    interests = request.data.get("interests", [])

    user.interests = interests
    user.onboarding_step = max(user.onboarding_step, 2)

    user.save(update_fields=["interests", "onboarding_step"])

    return Response({
        "message": "Interests saved"
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

@api_view(["POST"])
def set_online(request):
    set_user_online(request.user.id)
    return Response({"status": "ok"})

@api_view(["POST"])
def set_offline(request):
    set_user_offline(request.user.id)
    return Response({"status": "ok"})

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

    user.last_seen = timezone.now()
    user.save(update_fields=["last_seen"])

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