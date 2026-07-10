from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Report, ProblemReport, Feedback
from .serializers import ReportSerializer, ProblemReportSerializer, FeedbackSerializer


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