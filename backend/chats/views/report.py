from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from feedback.models import Report
from chats.models import Message


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