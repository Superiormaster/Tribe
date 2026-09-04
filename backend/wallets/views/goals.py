# wallet/views/goals.py

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wallets.models import MonetizationGoal

from wallets.serializers import (
    MonetizationGoalSerializer,
)

from wallets.services.goals import (
    create_goal,
)


class GoalListCreateView(APIView):
    """
    List and create monetization goals.

    GET  /goals/
    POST /goals/
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):

        goals = (
            MonetizationGoal.objects
            .filter(
                user=request.user
            )
            .order_by(
                "-is_active",
                "-created_at",
            )
        )

        serializer = MonetizationGoalSerializer(
            goals,
            many=True,
        )

        return Response(
            serializer.data
        )

    def post(self, request):

        serializer = MonetizationGoalSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        goal = create_goal(
            user=request.user,
            title=serializer.validated_data[
                "title"
            ],
            target_amount=serializer.validated_data[
                "target_amount"
            ],
            currency=serializer.validated_data.get(
                "currency",
                "NGN",
            ),
        )

        response_serializer = (
            MonetizationGoalSerializer(
                goal
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )