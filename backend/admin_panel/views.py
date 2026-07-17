from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from notifications.services import create_notification
from users.models import SavedLoginDevice
from .permissions import IsAdmin, IsSuperAdmin
from django.shortcuts import get_object_or_404
from django.db.models import Q
from itertools import chain
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny
from users.serializers import ProfileSerializer
import uuid
from hashlib import sha256
from django.utils import timezone
from communities.models import TribeRequest, Tribe
from .serializers import (
    AdminTribeRequestSerializer,
    RejectTribeRequestSerializer,
    CreateTribeSerializer,
    ReportSerializer,
    UserSerializer,
    ProblemReportSerializer,
    FeedbackSerializer,
)
from feedback.models import Feedback, Report, ProblemReport

class AdminReportPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

class AdminUserPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

User = get_user_model()


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

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    email = request.data.get('email')
    password = request.data.get('password')

    user = authenticate(
        request,
        email=email,
        password=password
    )

    if not user:
        return Response(
            {"detail": "Invalid credentials"},
            status=401
        )

    if user.role not in [
        'admin',
        'superadmin'
    ]:
        return Response(
            {"detail": "You are not an admin"},
            status=403
        )

    data = issue_tokens(user)

    # create session exactly like normal login
    create_session(
        user,
        request,
        data["refresh"]
    )

    data["user"] = ProfileSerializer(user).data

    return Response(data)

@api_view(["GET"])
@permission_classes([IsAdmin])
def get_users(request):
    search = request.GET.get("search", "").strip()
    role = request.GET.get("role")
    status = request.GET.get("status")

    queryset = User.objects.all().order_by("-date_joined")

    if search:
        queryset = queryset.filter(
            Q(username__icontains=search)
            | Q(email__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
        )

    if role:
        queryset = queryset.filter(role=role)

    if status == "active":
        queryset = queryset.filter(is_active=True)

    elif status == "banned":
        queryset = queryset.filter(is_active=False)

    paginator = AdminUserPagination()

    page = paginator.paginate_queryset(
        queryset,
        request
    )

    serializer = UserSerializer(
        page,
        many=True
    )

    return paginator.get_paginated_response(
        serializer.data
    )


@api_view(['POST'])
@permission_classes([IsAdmin])
def ban_user(request):
    user_id = request.data.get('user_id')
    user = User.objects.get(id=user_id)
    user.is_active = False
    user.save()
    return Response({"message": "User banned"})


@api_view(['POST'])
@permission_classes([IsAdmin])
def unban_user(request):
    user_id = request.data.get('user_id')
    user = User.objects.get(id=user_id)
    user.is_active = True
    user.save()
    return Response({"message": "User unbanned"})


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_user_detail(request, user_id):
    user = User.objects.get(id=user_id)
    return Response(UserSerializer(user).data)

@api_view(["GET"])
@permission_classes([IsAdmin])
def get_reports(request):

    search = request.GET.get("search", "").strip()
    status = request.GET.get("status", "")
    report_type = request.GET.get("type", "")

    content_reports = Report.objects.select_related(
        "reporter",
        "target_user",
        "target_post",
        "target_comment",
        "target_message",
        "target_community",
    )

    problem_reports = ProblemReport.objects.select_related(
        "user"
    )

    if search:
        content_reports = content_reports.filter(
            Q(reporter__username__icontains=search)
            | Q(reporter__email__icontains=search)
            | Q(reason__icontains=search)
            | Q(details__icontains=search)
        )

        problem_reports = problem_reports.filter(
            Q(user__username__icontains=search)
            | Q(user__email__icontains=search)
            | Q(message__icontains=search)
            | Q(report_type__icontains=search)
        )

    if status:
        content_reports = content_reports.filter(
            status=status
        )

        problem_reports = problem_reports.filter(
            status=status
        )

    if report_type:
        content_reports = content_reports.filter(
            report_type=report_type
        )

        problem_reports = problem_reports.filter(
            report_type=report_type
        )

    merged = sorted(
        chain(
            content_reports,
            problem_reports,
        ),
        key=lambda x: x.created_at,
        reverse=True,
    )

    paginator = AdminReportPagination()

    page = paginator.paginate_queryset(
        merged,
        request,
    )

    results = []

    for obj in page:

        if isinstance(obj, Report):
            results.append(
                ReportSerializer(obj).data
            )
        else:
            results.append(
                ProblemReportSerializer(obj).data
            )

    return paginator.get_paginated_response(
        results
    )

@api_view(["GET"])
@permission_classes([IsAdmin])
def report_detail(request, category, report_id):
  
    if category == "problem":
        problem = ProblemReport.objects.select_related("user").filter(id=report_id).first()

        if problem:
            return Response(
                ProblemReportSerializer(problem).data
            )

    report = Report.objects.select_related(
        "reporter",
        "target_user",
        "target_post",
        "target_repost",
        "target_comment",
        "target_message",
        "target_community",
    ).filter(id=report_id).first()

    if report:
        return Response(
            ReportSerializer(report).data
        )

    return Response(
        {
            "detail": "Not found."
        },
        status=404,
    )

@api_view(['POST'])
@permission_classes([IsAdmin])
def resolve_report(request):
    report_id = request.data.get('report_id')
    report = Report.objects.get(id=report_id)
    report.status = 'resolved'
    report.save()
    return Response({"message": "Report resolved"})


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def delete_report(request, report_id):
    report = Report.objects.get(id=report_id)
    report.delete()
    return Response({"message": "Report deleted"})

@api_view(["GET"])
@permission_classes([IsAdmin])
def feedback_list(request):
    search = request.GET.get("search", "").strip()
    resolved = request.GET.get("resolved", "")

    feedback = Feedback.objects.select_related(
        "user"
    ).order_by("-created_at")

    if search:
        feedback = feedback.filter(
            Q(user__username__icontains=search)
            | Q(user__email__icontains=search)
            | Q(message__icontains=search)
            | Q(rating__icontains=search)
        )

    if resolved != "":
        feedback = feedback.filter(
            resolved=resolved.lower() == "true"
        )

    paginator = AdminReportPagination()

    page = paginator.paginate_queryset(
        feedback,
        request
    )

    serializer = FeedbackSerializer(
        page,
        many=True
    )

    return paginator.get_paginated_response(
        serializer.data
    )

@api_view(["GET"])
@permission_classes([IsAdmin])
def feedback_detail(request, feedback_id):
    feedback = Feedback.objects.select_related(
        "user"
    ).filter(
        id=feedback_id
    ).first()

    if not feedback:
        return Response(
            {"detail": "Not found."},
            status=404
        )

    return Response(
      FeedbackSerializer(feedback).data
    )

@api_view(["GET"])
@permission_classes([IsAdmin])
def dashboard_stats(request):
    reports_count = Report.objects.count()
    problem_reports_count = ProblemReport.objects.count()

    return Response({
        "users": User.objects.count(),
        "reports": reports_count + problem_reports_count,
        "feedback": Feedback.objects.count(),
        "tribes": Tribe.objects.count(),
        "banned_users": User.objects.filter(
            is_active=False
        ).count(),
    })

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_me(request):
    serializer = ProfileSerializer(request.user)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsSuperAdmin])
def create_admin(request):

    serializer = CreateAdminSerializer(
        data=request.data
    )

    serializer.is_valid(raise_exception=True)

    user = serializer.save()

    return Response(
        {"message": "Admin created successfully"}
    )

@api_view(["GET"])
@permission_classes([IsAdmin])
def list_tribe_requests(request):
    search = request.GET.get("search", "").strip()
    status_filter = request.GET.get("status", "all")

    queryset = TribeRequest.objects.select_related(
        "creator",
        "reviewed_by",
    )

    if status_filter != "all":
        queryset = queryset.filter(status=status_filter)

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(creator__username__icontains=search)
            | Q(creator__email__icontains=search)
        )

    queryset = queryset.order_by(
        "status",
        "-created_at",
    )

    paginator = PageNumberPagination()
    paginator.page_size = 20

    page = paginator.paginate_queryset(
        queryset,
        request,
    )

    serializer = AdminTribeRequestSerializer(
        page,
        many=True,
    )

    return paginator.get_paginated_response(
        serializer.data
    )

@api_view(["GET"])
@permission_classes([IsAdmin])
def tribe_request_detail(request, pk):

    try:
        obj = TribeRequest.objects.select_related(
            "creator",
            "reviewed_by"
        ).get(id=pk)
    except TribeRequest.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    serializer = AdminTribeRequestSerializer(obj)

    return Response(serializer.data)

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_tribe_request(request, pk):

    try:
        tribe_request = TribeRequest.objects.select_related(
            "tribe"
        ).get(id=pk)

    except TribeRequest.DoesNotExist:
        return Response(
            {"detail": "Not found."},
            status=404,
        )

    if (
        tribe_request.status == "approved"
        and hasattr(tribe_request, "tribe")
    ):
        tribe_request.tribe.delete()

    tribe_request.delete()

    return Response(
        {
            "detail":
            "Deleted successfully."
        }
    )

@api_view(["POST"])
@permission_classes([IsAdmin])
def reject_tribe_request(request):

    serializer = RejectTribeRequestSerializer(
        data=request.data
    )

    serializer.is_valid(raise_exception=True)

    tribe_request = TribeRequest.objects.filter(
        id=serializer.validated_data["request_id"]
    ).first()

    if not tribe_request:
        return Response(
            {"detail": "Request not found."},
            status=404,
        )

    if tribe_request.status != "pending":
        return Response(
            {
                "detail":
                "This request has already been reviewed."
            },
            status=400,
        )

    tribe_request.status = "rejected"
    tribe_request.reviewed_by = request.user
    tribe_request.reviewed_at = timezone.now()

    tribe_request.rejection_reason = serializer.validated_data[
        "reason"
    ]

    tribe_request.save()

    create_notification(
        type="tribe_request_rejected",
        recipient=tribe_request.creator,
        actors=[request.user],
        tribe_request=tribe_request,
    )

    return Response(
        {
            "detail":
            "Tribe request rejected."
        }
    )


@api_view(["POST"])
@permission_classes([IsAdmin])
def create_tribe_from_request(request):

    serializer = CreateTribeSerializer(
        data=request.data
    )

    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data

    tribe_request = TribeRequest.objects.filter(
        id=data["request_id"]
    ).select_related("creator").first()

    if not tribe_request:
        return Response(
            {"detail": "Request not found."},
            status=404,
        )

    if tribe_request.status != "pending":
        return Response(
            {
                "detail":
                "This request has already been reviewed."
            },
            status=400,
        )

    if Tribe.objects.filter(
        name=data["name"]
    ).exists():
        return Response(
            {
                "detail":
                "A tribe with this name already exists."
            },
            status=400,
        )

    tribe = Tribe.objects.create(
        name=data["name"],
        description=data["description"],
        allow_reels=data["allow_reels"],
    )

    tribe_request.status = "approved"
    tribe_request.reviewed_by = request.user
    tribe_request.reviewed_at = timezone.now()
    tribe_request.save()

    create_notification(
        type="tribe_request_approved",
        recipient=tribe_request.creator,
        actors=[request.user],
        tribe_request=tribe_request,
    )

    return Response({
        "detail": "Tribe created successfully.",
        "tribe": {
            "id": tribe.id,
            "name": tribe.name,
        }
    })