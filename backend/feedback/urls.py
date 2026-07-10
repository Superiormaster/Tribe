from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ReportViewSet,
    ProblemReportViewSet,
    FeedbackViewSet,
)

router = DefaultRouter()
router.register(
    r"reports",
    ReportViewSet,
    basename="reports"
)

router.register(
    r"problem-reports",
    ProblemReportViewSet,
    basename="problem-reports"
)

router.register(
    r"feedback",
    FeedbackViewSet,
    basename="feedback"
)

urlpatterns = [
    path("", include(router.urls)),
]