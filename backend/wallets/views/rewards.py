# wallet/views/rewards.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from wallets.models import AudienceReward

from wallets.serializers import (
    AudienceRewardSerializer,
)


class RewardPagination(
    PageNumberPagination
):
    page_size = 20

    page_size_query_param = "page_size"

    max_page_size = 100


class RewardListView(APIView):
    """
    List audience rewards belonging to
    the authenticated user.

    GET /rewards/

    Optional:

        ?claimed=true
        ?claimed=false
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):

        queryset = (
            AudienceReward.objects
            .filter(
                user=request.user
            )
            .order_by(
                "-created_at"
            )
        )

        claimed = request.query_params.get(
            "claimed"
        )

        if claimed is not None:

            if claimed.lower() == "true":
                queryset = queryset.filter(
                    is_claimed=True
                )

            elif claimed.lower() == "false":
                queryset = queryset.filter(
                    is_claimed=False
                )

        paginator = RewardPagination()

        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self,
        )

        serializer = AudienceRewardSerializer(
            page,
            many=True,
        )

        return paginator.get_paginated_response(
            serializer.data
        )