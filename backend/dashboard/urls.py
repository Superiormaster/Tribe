from django.urls import path
from .views import (
    AnalyticsOverviewView,
    AnalyticsContentView,
    AnalyticsAudienceView,
    AnalyticsCommunityView,
    AnalyticsReelsView,
)

urlpatterns = [
    path(
        "dashboard/overview/",
        AnalyticsOverviewView.as_view(),
        name="analytics-overview",
    ),

    path(
        "dashboard/content/",
        AnalyticsContentView.as_view(),
        name="analytics-content",
    ),

    path(
        "dashboard/audience/",
        AnalyticsAudienceView.as_view(),
        name="analytics-audience",
    ),

    path(
        "dashboard/communities/",
        AnalyticsCommunityView.as_view(),
        name="analytics-communities",
    ),

    path(
        "dashboard/reels/",
        AnalyticsReelsView.as_view(),
        name="analytics-reels",
    ),
]