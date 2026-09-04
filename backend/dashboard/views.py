from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import AnalyticsOverviewSerializer
from .services.overview import AnalyticsOverviewService
from .services.content import AnalyticsContentService
from .services.communities import AnalyticsCommunityService
from .services.audience import AnalyticsAudienceService
from .services.reels import AnalyticsReelsService


class AnalyticsOverviewView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        service = AnalyticsOverviewService(
            user=request.user,
            params=request.query_params,
        )

        data = service.get_overview()

        serializer = AnalyticsOverviewSerializer(
            data
        )

        return Response(
            serializer.data
        )

class AnalyticsContentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        service = AnalyticsContentService(
            request.user,
            request.query_params,
        )

        return Response(
            service.get_content()
        )

class AnalyticsCommunityView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        service = AnalyticsCommunityService(
            user=request.user,
            params=request.query_params,
        )

        communities = service.get_communities()

        return Response({
            "communities": communities,
            "range": request.query_params.get(
                "range",
                "7D",
            ),
        })

class AnalyticsAudienceView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        service = AnalyticsAudienceService(
            request.user,
            request.query_params,
        )

        return Response(
            service.get_audience()
        )

class AnalyticsReelsView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        service = AnalyticsReelsService(
            request.user,
            request.query_params,
        )

        return Response(
            service.get_reels()
        )