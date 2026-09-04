from datetime import timedelta

from django.utils import timezone

from users.models import Star, ProfileView


class AnalyticsAudienceService:

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

    def get_audience(self):

        total_stars = Star.objects.filter(
            starred_user=self.user,
        ).count()

        new_stars = Star.objects.filter(
            starred_user=self.user,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
        ).count()

        previous_start, previous_end = (
            self.get_previous_period()
        )

        previous_new_stars = Star.objects.filter(
            starred_user=self.user,
            created_at__gte=previous_start,
            created_at__lt=previous_end,
        ).count()

        profile_views = ProfileView.objects.filter(
            profile=self.user,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
        ).count()

        active_stars = ProfileView.objects.filter(
            profile=self.user,
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
        ).values(
            "viewer"
        ).distinct().count()

        growth = 0

        if previous_new_stars > 0:
            growth = (
                (
                    new_stars - previous_new_stars
                )
                / previous_new_stars
            ) * 100

        return {
            "stars": total_stars,
            "newStars": new_stars,
            "lostStars": 0,
            "activeStars": active_stars,
            "profileViews": profile_views,
            "growth": round(
                growth,
                1,
            ),
            "range": self.range,
        }