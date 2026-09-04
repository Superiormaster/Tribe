# wallet/views/transactions.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from wallets.models import WalletTransaction

from wallets.serializers import (
    WalletTransactionSerializer,
)


class TransactionPagination(
    PageNumberPagination
):
    """
    Pagination specifically for wallet transactions.
    """

    page_size = 20

    page_size_query_param = "page_size"

    max_page_size = 100


class TransactionListView(APIView):
    """
    List the authenticated user's wallet transactions.

    GET /transactions/

    Query parameters:

        ?page=1
        ?page_size=20
        ?status=completed
        ?type=earning
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):

        wallet = getattr(
            request.user,
            "wallet",
            None,
        )

        if wallet is None:
            return Response({
                "count": 0,
                "next": None,
                "previous": None,
                "results": [],
            })

        queryset = (
            WalletTransaction.objects
            .filter(
                wallet=wallet,
            )
            .select_related(
                "revenue",
                "withdrawal",
                "reward",
            )
            .order_by(
                "-created_at"
            )
        )

        # ----------------------------------------------------
        # STATUS FILTER
        # ----------------------------------------------------

        status = request.query_params.get(
            "status"
        )

        if status:
            queryset = queryset.filter(
                status=status
            )

        # ----------------------------------------------------
        # TYPE FILTER
        # ----------------------------------------------------

        transaction_type = (
            request.query_params.get(
                "type"
            )
        )

        if transaction_type:
            queryset = queryset.filter(
                transaction_type=transaction_type
            )

        # ----------------------------------------------------
        # PAGINATION
        # ----------------------------------------------------

        paginator = TransactionPagination()

        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self,
        )

        serializer = WalletTransactionSerializer(
            page,
            many=True,
        )

        return paginator.get_paginated_response(
            serializer.data
        )