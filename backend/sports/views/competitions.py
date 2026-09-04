from rest_framework.response import Response
from rest_framework.views import APIView

from sports.models import (
    Competition,
    CompetitionSeason,
)

from sports.serializers import (
    CompetitionListSerializer,
    CompetitionSerializer,
    StandingSerializer,
)

from sports.services.cache import SportsCache


class CompetitionListView(APIView):
    """
    GET /api/sports/competitions/
    """

    def get(self, request):

        competitions = (
            Competition.objects
            .filter(
                is_active=True
            )
            .order_by(
                "-is_major",
                "name",
            )
        )

        data = CompetitionListSerializer(
            competitions,
            many=True,
        ).data

        return Response({
            "count": len(data),
            "results": data,
        })


class CompetitionDetailView(APIView):
    """
    GET /api/sports/competitions/<competition_id>/
    """

    def get(
        self,
        request,
        competition_id,
    ):

        cached = (
            SportsCache.get_competition(
                competition_id
            )
        )

        if cached is not None:
            return Response({
                "result": cached,
                "cached": True,
            })

        competition = (
            Competition.objects
            .filter(
                provider_id=competition_id
            )
            .first()
        )

        if not competition:
            return Response(
                {
                    "detail": (
                        "Competition not found."
                    )
                },
                status=404,
            )

        data = CompetitionSerializer(
            competition
        ).data

        SportsCache.set_competition(
            competition_id,
            data,
        )

        return Response({
            "result": data,
            "cached": False,
        })

class CompetitionStandingsView(APIView):
    """
    GET /api/sports/competitions/<competition_id>/standings/

    Optional:

        ?season=2026
        ?group=1
    """

    def get(
        self,
        request,
        competition_id,
    ):

        season = request.query_params.get(
            "season"
        )

        group = request.query_params.get(
            "group"
        )

        if not season:
            return Response(
                {
                    "detail": (
                        "season is required."
                    )
                },
                status=400,
            )

        if not season.isdigit():
            return Response(
                {
                    "detail": (
                        "Invalid season."
                    )
                },
                status=400,
            )

        season = int(season)

        group_id = None

        if group:
            if not group.isdigit():
                return Response(
                    {
                        "detail": (
                            "Invalid group."
                        )
                    },
                    status=400,
                )

            group_id = int(group)

        cached = (
            SportsCache.get_standings(
                competition_id,
                season,
                group_id,
            )
        )

        if cached is not None:
            return Response({
                "competition": competition_id,
                "season": season,
                "results": cached,
                "cached": True,
            })

        from sports.services.standings import (
            StandingService,
        )

        service = StandingService()

        standings = service.get_standings(
            competition_id=competition_id,
            season=season,
            group_index=group_id,
        )

        data = StandingSerializer(
            standings,
            many=True,
        ).data

        SportsCache.set_standings(
            competition_id,
            season,
            data,
            group_id,
        )

        return Response({
            "competition": competition_id,
            "season": season,
            "count": len(data),
            "results": data,
            "cached": False,
        })