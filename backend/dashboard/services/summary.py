from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta

from post.models import (
    Post,
    PostView,
    Like,
    Comment,
    Repost,
    Share,
    Bookmark,
)

from users.models import Star, ProfileView

class AnalyticsSummaryService:

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

        # Safety fallback
        return self.end_date - timedelta(days=7)
  
    def filter_date(self, queryset, field="created_at"):
        if self.start_date is None:
            return queryset

        return queryset.filter(
            **{
                f"{field}__gte": self.start_date,
                f"{field}__lte": self.end_date,
            }
        )

    def get_summary(self):

        posts = Post.objects.filter(
            user=self.user,
            is_deleted=False,
        )

        post_views = PostView.objects.filter(
            post__user=self.user,
            post__is_deleted=False,
        )

        likes = Like.objects.filter(
            post__user=self.user,
            post__is_deleted=False,
        )

        comments = Comment.objects.filter(
            post__user=self.user,
            post__is_deleted=False,
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

        stars = Star.objects.filter(
            starred_user=self.user,
        )

        profile_views = ProfileView.objects.filter(
            profile=self.user,
        )

        impressions = self.filter_date(post_views).count()

        like_count = self.filter_date(likes).count()

        comment_count = self.filter_date(comments).count()

        repost_count = self.filter_date(reposts).count()

        share_count = self.filter_date(shares).count()

        bookmark_count = self.filter_date(bookmarks).count()

        star_count = self.filter_date(stars).count()

        profile_view_count = self.filter_date(profile_views).count()

        engagement = (
            like_count
            + comment_count
            + repost_count
            + share_count
            + bookmark_count
        )

        return {
            "impressions": self.metric(
                "impressions",
                "Impressions",
                impressions,
            ),

            "engagement": self.metric(
                "engagement",
                "Engagement",
                engagement,
            ),

            "stars": self.metric(
                "stars",
                "Stars",
                star_count,
            ),

            "profileViews": self.metric(
                "profileViews",
                "Profile Views",
                profile_view_count,
            ),

            "likes": self.metric(
                "likes",
                "Likes",
                like_count,
            ),

            "comments": self.metric(
                "comments",
                "Comments",
                comment_count,
            ),

            "shares": self.metric(
                "shares",
                "Shares",
                share_count,
            ),

            "bookmarks": self.metric(
                "bookmarks",
                "Bookmarks",
                bookmark_count,
            ),
        }

    def metric(self, metric_id, title, value):

        previous_value = self.get_previous_value(metric_id)

        growth = 0

        if previous_value > 0:
            growth = (
                (value - previous_value)
                / previous_value
            ) * 100

        return {
            "id": metric_id,
            "title": title,
            "value": value,
            "formattedValue": self.format_value(value),
            "previousValue": previous_value,
            "growth": round(growth, 1),
            "positive": growth >= 0,
        }

    def format_value(self, value):

        if value >= 1_000_000_000:
            return f"{value / 1_000_000_000:.1f}B"
  
        if value >= 1_000_000:
            return f"{value / 1_000_000:.1f}M"

        if value >= 1_000:
            return f"{value / 1_000:.1f}K"

        return str(value)

    def get_previous_value(self, metric_id):

        if self.start_date is None:
            return 0

        period_length = self.end_date - self.start_date

        previous_end = self.start_date
        previous_start = previous_end - period_length

        if metric_id == "impressions":

            qs = PostView.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
                created_at__gte=previous_start,
                created_at__lt=previous_end,
            )

        elif metric_id == "likes":

            qs = Like.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
                created_at__gte=previous_start,
                created_at__lt=previous_end,
            )

        elif metric_id == "comments":

            qs = Comment.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
                created_at__gte=previous_start,
                created_at__lt=previous_end,
            )

        elif metric_id == "stars":

            qs = Star.objects.filter(
                starred_user=self.user,
                created_at__gte=previous_start,
                created_at__lt=previous_end,
            )

        elif metric_id == "profileViews":

            qs = ProfileView.objects.filter(
                profile=self.user,
                created_at__gte=previous_start,
                created_at__lt=previous_end,
            )

        elif metric_id == "bookmarks":

            qs = Bookmark.objects.filter(
                post__user=self.user,
                post__is_deleted=False,
                created_at__gte=previous_start,
                created_at__lt=previous_end,
            )

        elif metric_id == "shares":

            qs = Share.objects.filter(
                post__user=self.user,
                is_deleted=False,
                status="approved",
                created_at__gte=previous_start,
                created_at__lt=previous_end,
            )

        elif metric_id == "engagement":

            return (
                self.get_previous_value("likes")
                + self.get_previous_value("comments")
                + self.get_previous_value("shares")
                + self.get_previous_value("bookmarks")
            )

        else:
            return 0

        return qs.count()