from rest_framework import generics, status, permissions, viewsets, serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.http import JsonResponse
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from django.http import JsonResponse
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .status import set_user_online, set_user_offline
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import (
    urlsafe_base64_encode,
    urlsafe_base64_decode
)
from rest_framework.authtoken.models import Token
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import json
from .ip_address import get_location
from django.contrib.auth import login
from django.contrib.auth import authenticate
import requests, uuid
from post.models import Post
from post.serializers import PostSerializer
from django.utils.encoding import force_bytes
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from sib_api_v3_sdk import ApiClient, Configuration
from sib_api_v3_sdk.api import transactional_emails_api
from sib_api_v3_sdk.models import SendSmtpEmail
from users.email import send_brevo_email
from .models import Star, ConnectionRequest, UserSession, UserKeyPair
from django.db.models import Count, Exists, OuterRef
from django.conf import settings
from .utils import create_account_cookie, verify_account_cookie
from math import radians, sin, cos, sqrt, atan2

from .serializers import RegisterSerializer, ProfileSerializer, GoogleAuthSerializer, CustomTokenObtainPairSerializer, PublicProfileSerializer

User = get_user_model()

def distance(lat1, lon1, lat2, lon2):
    R = 6371  # km

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c

def set_cookie_account(response, request, user, account_key=None):
    """
    Update the account_tokens and selected_account cookies
    """
    if not account_key:
        account_key = user.email

    # Load existing cookie
    account_tokens = request.COOKIES.get("account_tokens")
    if account_tokens:
        try:
            account_tokens = json.loads(account_tokens)
        except json.JSONDecodeError:
            account_tokens = {}
    else:
        account_tokens = {}

    signed_token = create_account_cookie(user)
    account_tokens[account_key] = signed_token

    response.set_cookie(
        "account_tokens",
        json.dumps(account_tokens),
        httponly=True,
        secure=getattr(settings, "COOKIE_SECURE", False),
        samesite=getattr(settings, "COOKIE_SAMESITE", "Lax"),
        max_age=60 * 60 * 24 * 7  # 7 days
    )

    response.set_cookie(
        "selected_account",
        account_key,
        httponly=True,
        secure=getattr(settings, "COOKIE_SECURE", False),
        samesite=getattr(settings, "COOKIE_SAMESITE", "Lax"),
        max_age=60 * 60 * 24 * 7
    )

    return response

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

        res = Response({"success": True,   "onboarding_step": user.onboarding_step })
        update_user_location(request, user)
        return set_cookie_account(res, request, user)

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

        res = Response({"success": True,   "onboarding_step": user.onboarding_step })
        update_user_location(request, user)
        return set_cookie_account(res, request, user)

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
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.auth

        if token:
            token.delete()

        account_key = request.COOKIES.get("selected_account")
        account_tokens = request.COOKIES.get("account_tokens")

        response = Response({"success": True})

        if account_tokens:
            try:
                account_tokens = json.loads(account_tokens)
            except json.JSONDecodeError:
                account_tokens = {}

            # ❌ Remove only current account
            if account_key and account_key in account_tokens:
                del account_tokens[account_key]

            # ✅ If no accounts left → clear everything
            if not account_tokens:
                response.delete_cookie("account_tokens")
                response.delete_cookie("selected_account")
            else:
                # ✅ Update cookie without that account
                response.set_cookie(
                    "account_tokens",
                    json.dumps(account_tokens),
                    httponly=True,
                    secure=getattr(settings, "COOKIE_SECURE", False),
                    samesite=getattr(settings, "COOKIE_SAMESITE", "Lax"),
                )

                # 🔥 Switch to another available account
                new_account = list(account_tokens.keys())[0]
                response.set_cookie(
                    "selected_account",
                    new_account,
                    httponly=True,
                    secure=getattr(settings, "COOKIE_SECURE", False),
                    samesite=getattr(settings, "COOKIE_SAMESITE", "Lax"),
                )

        return response

# -----------------------------
# SWITCH ACTIVE ACCOUNT
# -----------------------------
class SwitchAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_email = request.data.get("email")

        account_tokens = request.COOKIES.get("account_tokens", "{}")

        try:
            account_tokens = json.loads(account_tokens)
        except json.JSONDecodeError:
            return Response({"error": "Invalid cookie"}, status=400)

        if target_email not in account_tokens:
            return Response({"error": "Account not found"}, status=404)

        response = Response({"success": True, "selected_account": target_email})

        response.set_cookie(
            "selected_account",
            target_email,
            httponly=True,
            secure=getattr(settings, "COOKIE_SECURE", False),
            samesite=getattr(settings, "COOKIE_SAMESITE", "Lax"),
            max_age=60 * 60 * 24 * 7
        )

        return response

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

    posts = Post.objects.filter(user=user).order_by("-created_at")[:20]

    profile_data = ProfileSerializer(user).data
    posts_data = PostSerializer(posts, many=True, context={"request": request}).data

    data = {
        "profile": profile_data,
        "posts": posts_data,
        "stats": {
            "posts": posts.count(),
            "starred_user": profile_data["starred_count"],  # stars received
            "stars": profile_data["stars_count"],          # stars given
        },
        "relationship": get_relationship(request.user, user)
    }

    return Response(data)

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
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{target.id}",
            {
                "type": "send_notification",
                "message": f"{user.username} sent you a connection request",
                "notif_type": "connection_request",
                "from_user_id": user.id
            }
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
def discover_friends(request):
    user = request.user

    users = User.objects.exclude(id=user.id)

    # Step 2: If more than 20 users, apply optional filters
    if users.count() > 20:
        interest = request.query_params.get('interest')
        country = request.query_params.get('country')

        if interest:
            users = users.filter(interests__icontains=interest)
        if country:
            users = users.filter(country__iexact=country)

    # Step 3: Sort by popularity (stars received)
    users = users.annotate(
        stars_received_count=Count('starred_by'),
        is_starred=Exists(
            Star.objects.filter(
                star=user,
                starred_user=OuterRef('pk')
            )
        )
    ).order_by('-stars_received_count')[:20]

    # Step 4: Serialize
    data = [
        {
            "id": u.id,
            "username": u.username,
            "avatar": u.avatar if u.avatar else None,
            "bio": u.bio,
            "interests": u.interests,
            "country": u.country,
            "stars_count": u.starred_by.count(),
            "starred": u.is_starred, 
        }
        for u in users
    ]

    return Response(data)

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

        for u in users[:10]:  # ✅ already filtered users
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

    return Response(nearby[:10])

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

        return Response({"status": "accepted"})

    except ConnectionRequest.DoesNotExist:
        return Response({"error": "Request not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decline_connection(request, user_id):
    user = request.user
    target = User.objects.get(id=user_id)

    ConnectionRequest.objects.filter(
        from_user=target,
        to_user=user,
        status="pending"
    ).delete()

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
    """
    Return the onboarding status for the current user.
    """
    user = request.user
    return Response({
        "completed": user.onboarding_step
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
            starred = False
        else:
            starred = True

            # 🔔 Notification (SAFE FIXED VERSION)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{target_user.id}",
                {
                    "type": "send_notification",
                    "message": f"{user.username} starred you ⭐",
                    "notif_type": "star",
                    "from_user_id": user.id
                }
            )

        return Response({
            "starred": starred
        })

# -----------------------------
# PROFILE
# -----------------------------
class ProfileView(generics.RetrieveUpdateAPIView):

    #parser_classes = [MultiPartParser, FormParser]
    serializer_class = ProfileSerializer
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if user.onboarding_step == 1:
            user.onboarding_step = 2
            user.save(update_fields=["onboarding_step"])
            # Re-serialize to include updated onboarding step
            serializer = self.get_serializer(user)

        return Response(serializer.data)

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

    token, _ = Token.objects.get_or_create(user=user)

    # refresh expired token
    if token.created < timezone.now() - timedelta(days=7):
        token.delete()
        token = Token.objects.create(user=user)

    # OPTIONAL: track session (do NOT delete token)
    UserSession.objects.create(
        user=user,
        token=token.key,
        device=request.META.get("HTTP_USER_AGENT", "unknown")
    )

    return Response({
        "user_id": user.id,
        "username": user.username,
        "avatar": getattr(user, "avatar", None),
        "token": token.key,
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
    user_id = request.user.id

    redis_client.set(
        f"user:{user_id}:status",
        "online",
        ex=30
    )

    return Response({"status": "alive"})

def get_user_public_key(user):
    keypair = UserKeyPair.objects.filter(user=user).only("public_key").first()
    return keypair.public_key if keypair else None

@api_view(["GET"])
def get_public_key(request, user_id):
    user = User.objects.get(id=user_id)

    return Response({
        "public_key": get_user_public_key(user)
    })