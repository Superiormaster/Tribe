# wallet/views/revenue.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wallets.selectors.revenue import (
    get_revenue_data,
)


class RevenueView(APIView):
    """
    Return revenue information for the
    authenticated creator.

    GET /revenue/

    Supported query parameters:

        ?period=7d
        ?period=30d
        ?period=90d
        ?period=1y

        ?source=ads
        ?source=tips
        ?source=rewards
        ?source=sponsorship
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):

        period = request.query_params.get(
            "period",
            "30d",
        )

        source = request.query_params.get(
            "source"
        )

        data = get_revenue_data(
            user=request.user,
            period=period,
            source=source,
        )

        return Response(data)