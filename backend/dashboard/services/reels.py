from datetime import timedelta

from django.db.models import Sum, Avg
from django.utils import timezone

from post.models import Post, PostView


class AnalyticsReelsService:

    def __init__(self, user, params):
        self.user = user
        self.params = params

        self.range = params.get("range", "7D").upper()

        self.end_date = timezone.now()
        self.start_date = self.get_start_date()

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

    def get_previous_period(self):

        period_length = self.end_date - self.start_date

        previous_end = self.start_date
        previous_start = previous_end - period_length

        return previous_start, previous_end

    def get_reels(self):

        reels = Post.objects.filter(
            user=self.user,
            content_type="short_video",
            is_deleted=False,
        )

        current_views = PostView.objects.filter(
            post__in=reels,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
        )

        total_reels = reels.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
        ).count()

        total_views = current_views.count()

        watch_time = (
            current_views.aggregate(
                total=Sum("watch_time")
            )["total"]
            or 0
        )

        average_watch_time = (
            current_views.aggregate(
                average=Avg("watch_time")
            )["average"]
            or 0
        )

        completed = current_views.filter(
            completed=True
        ).count()

        completion_rate = (
            (completed / total_views) * 100
            if total_views
            else 0
        )

        previous_start, previous_end = self.get_previous_period()

        previous_views = PostView.objects.filter(
            post__in=reels,
            created_at__gte=previous_start,
            created_at__lt=previous_end,
        )

        previous_total_views = previous_views.count()

        growth = 0

        if previous_total_views > 0:
            growth = (
                (
                    total_views - previous_total_views
                )
                / previous_total_views
            ) * 100

        return {
            "totalReels": total_reels,

            "totalViews": total_views,

            "totalWatchTime": round(
                float(watch_time),
                2,
            ),

            "averageWatchTime": round(
                float(average_watch_time),
                2,
            ),

            "completionRate": round(
                completion_rate,
                1,
            ),

            "growth": round(
                growth,
                1,
            ),
        }