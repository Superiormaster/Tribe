from rest_framework.response import Response
from rest_framework.views import APIView

from sports.models import Player

from sports.serializers import (
    PlayerListSerializer,
    PlayerSerializer,
)

from sports.services.cache import SportsCache


class PlayerListView(APIView):
    """
    GET /api/sports/players/

    Optional:

        ?search=Mbappe
    """

    def get(self, request):

        queryset = (
            Player.objects
            .filter(
                is_active=True
            )
            .order_by(
                "name"
            )
        )

        search = request.query_params.get(
            "search"
        )

        if search:
            queryset = queryset.filter(
                name__icontains=search
            )

        data = PlayerListSerializer(
            queryset,
            many=True,
        ).data

        return Response({
            "count": len(data),
            "results": data,
        })


class PlayerDetailView(APIView):
    """
    GET /api/sports/players/<player_id>/
    """

    def get(
        self,
        request,
        player_id,
    ):

        cached = SportsCache.get_player(
            player_id
        )

        if cached is not None:
            return Response({
                "result": cached,
                "cached": True,
            })

        player = (
            Player.objects
            .filter(
                provider_id=player_id
            )
            .first()
        )

        if not player:
            return Response(
                {
                    "detail": (
                        "Player not found."
                    )
                },
                status=404,
            )

        data = PlayerSerializer(
            player
        ).data

        SportsCache.set_player(
            player_id,
            data,
        )

        return Response({
            "result": data,
            "cached": False,
        })