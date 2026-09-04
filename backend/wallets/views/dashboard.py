# wallet/views/dashboard.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wallets.selectors.dashboard import (
    get_dashboard_data,
)


class MonetizationDashboardView(APIView):
    """
    Main monetization dashboard.

    GET /monetization/

    Returns the complete creator monetization dashboard.
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):
        dashboard = get_dashboard_data(
            request.user
        )

        return Response(
            dashboard
        )