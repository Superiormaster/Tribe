from rest_framework import mixins, viewsets, generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Report, ProblemReport, Feedback, SupportRequest
from .serializers import ReportSerializer, ProblemReportSerializer, FeedbackSerializer, SupportRequestSerializer

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(
            reporter=self.request.user
        )
  
    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)

class ProblemReportViewSet(
    viewsets.ModelViewSet
):
    serializer_class = (
        ProblemReportSerializer
    )

    permission_classes = [
        IsAuthenticated
    ]

    def get_queryset(self):
        return ProblemReport.objects.filter(
            user=self.request.user
        )

    def perform_create(
        self,
        serializer
    ):
        serializer.save(
            user=self.request.user
        )

class SupportRequestCreateView(generics.CreateAPIView):
    serializer_class = SupportRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class MySupportRequestsView(generics.ListAPIView):
    serializer_class = SupportRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            SupportRequest.objects
            .filter(user=self.request.user)
            .order_by("-created_at")
        )

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_support_request(request, pk):
    try:
        support = SupportRequest.objects.get(
            id=pk,
            user=request.user,
        )
    except SupportRequest.DoesNotExist:
        return Response(
            {"error": "Support request not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if support.status not in [
        "resolved",
        "rejected",
        "closed",
    ]:
        return Response(
            {
                "error":
                "Only resolved, rejected or closed requests can be deleted."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    support.delete()

    return Response(
        {"message": "Support request deleted."},
        status=status.HTTP_204_NO_CONTENT,
    )

class FeedbackViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet
):
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Feedback.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )