from rest_framework import serializers
from .models import Report, Feedback, ProblemReport

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = "__all__"
        read_only_fields = ["reporter"]

class ProblemReportSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = ProblemReport
        fields = "__all__"
        read_only_fields = [
            "user",
            "status",
        ]

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = "__all__"
        read_only_fields = ["user"]