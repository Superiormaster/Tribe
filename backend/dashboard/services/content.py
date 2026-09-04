from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone

from post.models import (
    Post,
    PostView,
    Like,
    Comment,
    Repost,
    Share,
    Bookmark,
)


class AnalyticsContentService:

    def __init__(self, user, params=None):
        self.user = user
        self.params = params or {}

        self.range = self.params.get("range", "7D")
        self.metric = self.params.get("metric", "impressions")
        self.chart_type = self.params.get("chartType", "line")
        self.interval = self.params.get("interval", "daily")

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

    def filter_date(self, queryset, field="created_at"):
        return queryset.filter(
            **{
                f"{field}__gte": self.start_date,
                f"{field}__lte": self.end_date,
            }
        )

    def get_content(self):
        return {
            "range": self.range,
            "metric": self.metric,

            "chart": self.get_chart(),

            "topPosts": self.get_top_posts(),

            "mediaActivity": self.get_media_activity(),
        }

    def get_chart(self):
        return {
            "metric": self.metric,
            "chartType": self.chart_type,
            "interval": self.interval,
            "data": self.get_metric_chart(),
        }

    def get_metric_chart(self):

        if self.metric == "engagement":
            return self.get_engagement_chart()

        if self.metric == "reach":
            return self.get_reach_chart()

        queryset = self.get_metric_queryset()

        if queryset is None:
            return []

        truncation = self.get_interval_function()

        queryset = (
            queryset
            .annotate(period=truncation)
            .values("period")
            .annotate(value=Count("id", distinct=True))
            .order_by("period")
        )

        return [
            {
                "label": self.format_period_label(item["period"]),
                "value": item["value"],
            }
            for item in queryset
            if item["period"] is not None
        ]

    def get_metric_queryset(self):

        if self.metric == "impressions":
            return self.filter_date(
                PostView.objects.filter(
                    post__user=self.user,
                    post__is_deleted=False,
                )
            )

        if self.metric == "likes":
            return self.filter_date(
                Like.objects.filter(
                    post__user=self.user,
                    post__is_deleted=False,
                )
            )

        if self.metric == "comments":
            return self.filter_date(
                Comment.objects.filter(
                    post__user=self.user,
                    post__is_deleted=False,
                    is_deleted=False,
                )
            )

        if self.metric == "reposts":
            return self.filter_date(
                Repost.objects.filter(
                    post__user=self.user,
                    post__is_deleted=False,
                    is_deleted=False,
                )
            )

        if self.metric == "shares":
            return self.filter_date(
                Share.objects.filter(
                    post__user=self.user,
                    post__is_deleted=False,
                    is_deleted=False,
                    status="approved",
                )
            )

        if self.metric == "bookmarks":
            return self.filter_date(
                Bookmark.objects.filter(
                    post__user=self.user,
                    post__is_deleted=False,
                )
            )

        if self.metric == "videoViews":
            return self.filter_date(
                PostView.objects.filter(
                    post__user=self.user,
                    post__is_deleted=False,
                    post__content_type__in=[
                        "short_video",
                        "long_video",
                    ],
                )
            )

        return None

    def get_engagement_chart(self):

        totals = {}

        metric_models = [
            (
                Like,
                Q(
                    post__user=self.user,
                    post__is_deleted=False,
                ),
            ),
            (
                Comment,
                Q(
                    post__user=self.user,
                    post__is_deleted=False,
                    is_deleted=False,
                ),
            ),
            (
                Repost,
                Q(
                    post__user=self.user,
                    post__is_deleted=False,
                    is_deleted=False,
                ),
            ),
            (
                Share,
                Q(
                    post__user=self.user,
                    post__is_deleted=False,
                    is_deleted=False,
                    status="approved",
                ),
            ),
        ]

        truncation = self.get_interval_function()

        for model, filters in metric_models:

            queryset = model.objects.filter(filters)

            queryset = self.filter_date(queryset)

            queryset = (
                queryset
                .annotate(period=truncation)
                .values("period")
                .annotate(
                    value=Count("id", distinct=True)
                )
                .order_by("period")
            )

            for item in queryset:

                period = item["period"]

                if period is None:
                    continue

                totals[period] = (
                    totals.get(period, 0)
                    + item["value"]
                )

        periods = sorted(totals.keys())

        return [
            {
                "label": self.format_period_label(period),
                "value": totals[period],
            }
            for period in periods
        ]

    def get_reach_chart(self):

        queryset = self.filter_date(
            PostView.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
                user__isnull=False,
            )
        )

        queryset = (
            queryset
            .annotate(
                period=self.get_interval_function()
            )
            .values("period")
            .annotate(
                value=Count(
                    "user_id",
                    distinct=True,
                )
            )
            .order_by("period")
        )

        return [
            {
                "label": self.format_period_label(
                    item["period"]
                ),
                "value": item["value"],
            }
            for item in queryset
            if item["period"] is not None
        ]

    def get_effective_interval(self):

      # If frontend explicitly selected an interval,
      # respect it.
      if self.interval in ["daily", "weekly", "monthly"]:
          return self.interval
  
      if self.range in ["7D", "28D"]:
          return "daily"
  
      if self.range == "3M":
          return "weekly"
  
      if self.range == "1Y":
          return "monthly"
  
      return "daily"

    def get_interval_function(self):

      interval = self.get_effective_interval()
  
      if interval == "weekly":
          return TruncWeek("created_at")
  
      if interval == "monthly":
          return TruncMonth("created_at")
  
      return TruncDate("created_at")

    def format_period_label(self, period):

        if self.interval == "monthly":
            return period.strftime("%b %Y")

        if self.interval == "weekly":
            return f"W{period.isocalendar().week}"

        return period.strftime("%a")

    def get_top_posts(self):

        posts = (
            Post.objects
            .filter(
                user=self.user,
                is_deleted=False,
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
            )
            .annotate(
                impressions_count=Count(
                    "views",
                    distinct=True,
                ),

                likes_count=Count(
                    "likes",
                    distinct=True,
                ),

                comments_count=Count(
                    "comments",
                    filter=Q(
                        comments__is_deleted=False
                    ),
                    distinct=True,
                ),

                reposts_count=Count(
                    "reposts",
                    filter=Q(
                        reposts__is_deleted=False
                    ),
                    distinct=True,
                ),

                bookmarks_count=Count(
                    "bookmarks",
                    distinct=True,
                ),

                shares_count=Count(
                    "shares",
                    filter=Q(
                        shares__is_deleted=False,
                        shares__status="approved",
                    ),
                    distinct=True,
                ),
            )
            .order_by(
                "-impressions_count",
                "-created_at",
            )[:10]
        )

        return [
            {
                "id": str(post.id),
                "title": (
                    post.caption[:100]
                    if post.caption
                    else "Untitled post"
                ),
                "thumbnail": self.get_thumbnail(post),
                "impressions": post.impressions_count,
                "likes": post.likes_count,
                "comments": post.comments_count,
                "reposts": post.reposts_count,
                "shares": post.shares_count,
                "bookmarks": post.bookmarks_count,
                "engagementRate": self.get_engagement_rate(post),
            }
            for post in posts
        ]

    def normalize_media_url(self, value):
      """
      Normalize media URL values coming from R2 or legacy media.
  
      Returns:
          str | None
      """
  
      # Some fields may contain a list.
      if isinstance(value, list):
          value = value[0] if value else None
  
      # Only accept non-empty strings.
      if isinstance(value, str):
          value = value.strip()
  
          if value:
              return value
  
      return None

    def get_thumbnail(self, post):
      media = (
          post.media_files
          .select_related("asset")
          .order_by("order")
          .first()
      )
  
      if not media:
          return None
  
      # R2 media
      if media.asset:
          thumbnail = self.normalize_media_url(
              media.asset.thumbnail_url
          )
  
          if thumbnail:
              return thumbnail
  
          original = self.normalize_media_url(
              media.asset.original_url
          )
  
          if original:
              return original
  
      # Legacy media
      thumbnail = self.normalize_media_url(
          media.thumbnail
      )
  
      if thumbnail:
          return thumbnail
  
      return self.normalize_media_url(
          media.file
      )

    def get_engagement_rate(self, post):

        impressions = post.impressions_count

        if impressions == 0:
            return 0

        engagement = (
            post.likes_count
            + post.comments_count
            + post.reposts_count
            + post.shares_count
        )

        return round(
            (engagement / impressions) * 100,
            1,
        )

    def get_media_activity(self):
      """
      Returns content published during the selected period,
      together with growth compared to the previous equivalent period.
      """
  
      current_posts = self.filter_date(
          Post.objects.filter(
              user=self.user,
              is_deleted=False,
          )
      )
  
      # Calculate the previous period with the same duration.
      period_length = self.end_date - self.start_date
  
      previous_end_date = self.start_date
      previous_start_date = previous_end_date - period_length
  
      previous_posts = Post.objects.filter(
          user=self.user,
          is_deleted=False,
          created_at__gte=previous_start_date,
          created_at__lt=previous_end_date,
      )
  
      def get_growth(current, previous):
          if previous == 0:
              if current == 0:
                  return 0
              return 100
  
          return round(
              ((current - previous) / previous) * 100,
              1,
          )
  
      # Current period
      posts_count = current_posts.count()
  
      reels_count = current_posts.filter(
          content_type="short_video"
      ).count()
  
      photos_count = current_posts.filter(
          content_type="image"
      ).count()
  
      videos_count = current_posts.filter(
          content_type="long_video"
      ).count()
  
      # Previous period
      previous_posts_count = previous_posts.count()
  
      previous_reels_count = previous_posts.filter(
          content_type="short_video"
      ).count()
  
      previous_photos_count = previous_posts.filter(
          content_type="image"
      ).count()
  
      previous_videos_count = previous_posts.filter(
          content_type="long_video"
      ).count()
  
      return {
          "posts": posts_count,
          "reels": reels_count,
          "photos": photos_count,
          "videos": videos_count,
  
          "postGrowth": get_growth(
              posts_count,
              previous_posts_count,
          ),
  
          "reelGrowth": get_growth(
              reels_count,
              previous_reels_count,
          ),
  
          "photoGrowth": get_growth(
              photos_count,
              previous_photos_count,
          ),
  
          "videoGrowth": get_growth(
              videos_count,
              previous_videos_count,
          ),
      }