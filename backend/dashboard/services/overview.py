from .summary import AnalyticsSummaryService
from .charts import AnalyticsChartService
from .content import AnalyticsContentService
from .reels import AnalyticsReelsService
from .communities import AnalyticsCommunityService
from .audience import AnalyticsAudienceService


class AnalyticsOverviewService:

    def __init__(self, user, params):
        self.user = user
        self.params = params

    def get_overview(self):

        summary = AnalyticsSummaryService(
            user=self.user,
            params=self.params,
        ).get_summary()

        chart = AnalyticsChartService(
            user=self.user,
            params=self.params,
        ).get_chart()

        content_service = AnalyticsContentService(
            user=self.user,
            params=self.params,
        )

        reels = AnalyticsReelsService(
            user=self.user,
            params=self.params,
        ).get_reels()

        communities = AnalyticsCommunityService(
            user=self.user,
            params=self.params,
        ).get_communities()

        audience = AnalyticsAudienceService(
            user=self.user,
            params=self.params,
        ).get_audience()

        return {
            "chart": chart,
            "summary": summary,
            "content": content_service.get_content(),
            "topPosts": content_service.get_top_posts(),
            "audience": audience,
            "reels": reels,
            "communities": communities,
        }