from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from communities.models import Community
from feedback.models import Report
from chats.models import Message, Chat


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report(request, pk):
    message = get_object_or_404(
        Message,
        pk=pk,
    )

    report, created = Report.objects.get_or_create(
        reporter=request.user,
        report_type="message",
        target_message=message,
        defaults={
            "reason": request.data.get("reason"),
            "details": request.data.get("details", ""),
        },
    )

    if not created:
        return Response(
            {"message": "You already reported this message"},
            status=400,
        )

    return Response({
        "success": True,
        "message": "Message reported successfully",
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_chat(request, pk):
    chat = get_object_or_404(
        Chat,
        pk=pk,
    )

    report, created = Report.objects.get_or_create(
        reporter=request.user,
        report_type="chat",
        target_chat=chat,
        defaults={
            "reason": request.data.get("reason"),
            "details": request.data.get("details", ""),
        },
    )

    if not created:
        return Response(
            {"message": "You already reported this chat"},
            status=400,
        )

    return Response({
        "success": True,
        "message": "Chat reported successfully",
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_community(request, pk):
    community = get_object_or_404(
        Community,
        pk=pk,
    )

    report, created = Report.objects.get_or_create(
        reporter=request.user,
        report_type="community",
        target_community=community,
        defaults={
            "reason": request.data.get("reason"),
            "details": request.data.get("details", ""),
        },
    )

    if not created:
        return Response(
            {
                "message": "You already reported this community"
            },
            status=400,
        )

    return Response(
        {
            "success": True,
            "message": "Community reported successfully",
        },
        status=201,
    )