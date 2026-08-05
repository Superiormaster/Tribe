from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ReportViewSet,
    ProblemReportViewSet,
    FeedbackViewSet,
    SupportRequestCreateView,
    MySupportRequestsView,
    delete_support_request,
    ContactMessageCreateView,
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
    path(
        "support/",
        SupportRequestCreateView.as_view(),
        name="create-support-request",
    ),
    path(
        "support/my/",
        MySupportRequestsView.as_view(),
        name="my-support-requests",
    ),

    path(
        "support/<int:pk>/delete/",
        delete_support_request,
        name="delete_support_request",
    ),

    path(
        "support/contact/",
        ContactMessageCreateView.as_view(),
        name="contact-message",
    ),

    path("", include(router.urls)),
]