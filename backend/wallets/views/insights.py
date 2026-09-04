# wallets/views/insights.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wallets.services.insights import (
    get_insights,
)


class InsightListView(APIView):
    """
    Return monetization insights for
    the authenticated creator.

    GET /insights/

    Examples:

        /insights/?period=7d
        /insights/?period=30d
        /insights/?period=90d
        /insights/?period=1y
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):

        period = request.query_params.get(
            "period",
            "30d",
        )

        data = get_insights(
            user=request.user,
            period=period,
        )

        return Response(
            data
        )