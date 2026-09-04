# wallet/views/payouts.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from wallets.models import Payout

from wallets.serializers import (
    PayoutSerializer,
)


class PayoutPagination(
    PageNumberPagination
):
    page_size = 20

    page_size_query_param = "page_size"

    max_page_size = 100


class PayoutListView(APIView):
    """
    List the authenticated user's payouts.

    GET /payouts/
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):

        queryset = (
            Payout.objects
            .filter(
                wallet__user=request.user,
            )
            .select_related(
                "withdrawal",
                "withdrawal__bank_account",
            )
            .order_by(
                "-created_at"
            )
        )

        # ----------------------------------------------------
        # STATUS FILTER
        # ----------------------------------------------------

        payout_status = (
            request.query_params.get(
                "status"
            )
        )

        if payout_status:
            queryset = queryset.filter(
                status=payout_status
            )

        # ----------------------------------------------------
        # PAGINATION
        # ----------------------------------------------------

        paginator = PayoutPagination()

        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self,
        )

        serializer = PayoutSerializer(
            page,
            many=True,
        )

        return paginator.get_paginated_response(
            serializer.data
        )