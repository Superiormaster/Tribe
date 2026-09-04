from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone

from post.models import (
    PostView,
    Like,
    Comment,
    Repost,
    Share,
    Bookmark,
)

from users.models import Star, ProfileView


class AnalyticsChartService:

    def __init__(self, user, params):
        self.user = user
        self.params = params

        self.metric = params.get("metric", "impressions")
        self.chart_type = params.get("chartType", "line")
        self.interval = params.get("interval", "daily")
        self.range = params.get("range", "7D").upper()

        self.end_date = timezone.now()
        self.start_date = self.get_start_date()

    # --------------------------------------------------
    # DATE RANGE
    # --------------------------------------------------

    def get_start_date(self):

        if self.range == "7D":
            return self.end_date - timedelta(days=7)

        if self.range == "28D":
            return self.end_date - timedelta(days=28)

        if self.range == "3M":
            return self.end_date - timedelta(days=90)

        if self.range == "1Y":
            return self.end_date - timedelta(days=365)

        return self.end_date - timedelta(days=7)

    # --------------------------------------------------
    # MAIN
    # --------------------------------------------------

    def get_chart(self):

        data = self.get_metric_chart()

        return {
            "metric": self.metric,
            "chartType": self.chart_type,
            "interval": self.interval,
            "data": data,
        }

    # --------------------------------------------------
    # METRIC ROUTER
    # --------------------------------------------------

    def get_metric_chart(self):

        if self.metric == "engagement":
            return self.get_engagement_chart()

        queryset = self.get_metric_queryset()

        if queryset is None:
            return []

        return self.build_chart(queryset)

    # --------------------------------------------------
    # METRIC QUERYSETS
    # --------------------------------------------------

    def get_metric_queryset(self):

        if self.metric == "impressions":
            return PostView.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
            )

        if self.metric == "likes":
            return Like.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
            )

        if self.metric == "comments":
            return Comment.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
                is_deleted=False,
            )

        if self.metric == "reposts":
            return Repost.objects.filter(
                post__user=self.user,
                is_deleted=False,
            )

        if self.metric == "shares":
            return Share.objects.filter(
                post__user=self.user,
                is_deleted=False,
                status="approved",
            )

        if self.metric == "bookmarks":
            return Bookmark.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
            )

        if self.metric == "stars":
            return Star.objects.filter(
                starred_user=self.user,
            )

        if self.metric == "profileViews":
            return ProfileView.objects.filter(
                profile=self.user,
            )

        # Not implemented yet
        if self.metric == "reach":
            return None

        if self.metric == "videoViews":
            return None

        return None

    # --------------------------------------------------
    # CHART GROUPING
    # --------------------------------------------------

    def group_by(self, queryset):

        if self.interval == "weekly":
            return queryset.annotate(
                period=TruncWeek("created_at")
            )

        if self.interval == "monthly":
            return queryset.annotate(
                period=TruncMonth("created_at")
            )

        return queryset.annotate(
            period=TruncDate("created_at")
        )

    # --------------------------------------------------
    # BUILD NORMAL CHART
    # --------------------------------------------------

    def build_chart(self, queryset):

        queryset = queryset.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
        )

        grouped = (
            self.group_by(queryset)
            .values("period")
            .annotate(
                value=Count("id")
            )
            .order_by("period")
        )

        values = {
            item["period"]: item["value"]
            for item in grouped
        }

        periods = self.generate_periods()

        return [
            {
                "label": self.format_label(period),
                "value": values.get(period, 0),
            }
            for period in periods
        ]

    # --------------------------------------------------
    # GENERATE PERIODS
    # --------------------------------------------------

    def generate_periods(self):

        if self.interval == "monthly":
            return self.generate_months()

        if self.interval == "weekly":
            return self.generate_weeks()

        return self.generate_days()

    # --------------------------------------------------
    # DAILY
    # --------------------------------------------------

    def generate_days(self):

        start = self.start_date.date()
        end = self.end_date.date()

        periods = []

        current = start

        while current <= end:
            periods.append(current)
            current += timedelta(days=1)

        return periods

    # --------------------------------------------------
    # WEEKLY
    # --------------------------------------------------

    def generate_weeks(self):

        start = self.start_date.date()

        # Move to Monday
        start = start - timedelta(
            days=start.weekday()
        )

        end = self.end_date.date()

        periods = []

        current = start

        while current <= end:

            periods.append(current)

            current += timedelta(days=7)

        return periods

    # --------------------------------------------------
    # MONTHLY
    # --------------------------------------------------

    def generate_months(self):

        start = self.start_date.date().replace(day=1)
        end = self.end_date.date().replace(day=1)

        periods = []

        current = start

        while current <= end:

            periods.append(current)

            if current.month == 12:
                current = current.replace(
                    year=current.year + 1,
                    month=1,
                )
            else:
                current = current.replace(
                    month=current.month + 1,
                )

        return periods

    # --------------------------------------------------
    # LABEL
    # --------------------------------------------------

    def format_label(self, date):

        if self.interval == "monthly":
            return date.strftime("%b %Y")

        if self.interval == "weekly":
            return date.strftime("%b %d")

        return date.strftime("%a")

    # --------------------------------------------------
    # ENGAGEMENT
    # --------------------------------------------------

    def get_engagement_chart(self):

        likes = Like.objects.filter(
            post__user=self.user,
            post__is_deleted=False,
        )

        comments = Comment.objects.filter(
            post__user=self.user,
            post__is_deleted=False,
            is_deleted=False,
        )

        reposts = Repost.objects.filter(
            post__user=self.user,
            is_deleted=False,
        )

        shares = Share.objects.filter(
            post__user=self.user,
            is_deleted=False,
            status="approved",
        )

        bookmarks = Bookmark.objects.filter(
            post__user=self.user,
            post__is_deleted=False,
        )

        datasets = [
            likes,
            comments,
            reposts,
            shares,
            bookmarks,
        ]

        totals = {}

        for queryset in datasets:

            queryset = queryset.filter(
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
            )

            grouped = (
                self.group_by(queryset)
                .values("period")
                .annotate(
                    value=Count("id")
                )
            )

            for item in grouped:

                period = item["period"]

                totals[period] = (
                    totals.get(period, 0)
                    + item["value"]
                )

        periods = self.generate_periods()

        return [
            {
                "label": self.format_label(period),
                "value": totals.get(period, 0),
            }
            for period in periods
        ]