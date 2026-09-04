from rest_framework.response import Response
from rest_framework.views import APIView

from sports.models import Team

from sports.serializers import (
    TeamListSerializer,
    TeamSerializer,
    MatchListSerializer,
    PlayerListSerializer,
)

from sports.services.cache import SportsCache


class TeamListView(APIView):
    """
    GET /api/sports/teams/
    """

    def get(self, request):

        queryset = (
            Team.objects
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

        data = TeamListSerializer(
            queryset,
            many=True,
        ).data

        return Response({
            "count": len(data),
            "results": data,
        })


class TeamDetailView(APIView):
    """
    GET /api/sports/teams/<team_id>/
    """

    def get(
        self,
        request,
        team_id,
    ):

        cached = SportsCache.get_team(
            team_id
        )

        if cached is not None:
            return Response({
                "result": cached,
                "cached": True,
            })

        team = (
            Team.objects
            .filter(
                provider_id=team_id
            )
            .first()
        )

        if not team:
            return Response(
                {
                    "detail": (
                        "Team not found."
                    )
                },
                status=404,
            )

        data = TeamSerializer(
            team
        ).data

        SportsCache.set_team(
            team_id,
            data,
        )

        return Response({
            "result": data,
            "cached": False,
        })


class TeamMatchesView(APIView):
    """
    GET /api/sports/teams/<team_id>/matches/
    """

    def get(
        self,
        request,
        team_id,
    ):

        page = request.query_params.get(
            "page",
            "1",
        )

        try:
            page = max(
                1,
                int(page),
            )
        except ValueError:
            page = 1

        cached = (
            SportsCache.get_team_matches(
                team_id,
                page,
            )
        )

        if cached is not None:
            return Response({
                "results": cached,
                "cached": True,
            })

        team = (
            Team.objects
            .filter(
                provider_id=team_id
            )
            .first()
        )

        if not team:
            return Response(
                {
                    "detail": (
                        "Team not found."
                    )
                },
                status=404,
            )

        queryset = (
            team.home_matches.all()
            | team.away_matches.all()
        )

        queryset = (
            queryset
            .select_related(
                "home_team",
                "away_team",
                "competition",
                "season",
            )
            .order_by(
                "-scheduled_at"
            )
        )

        data = MatchListSerializer(
            queryset,
            many=True,
        ).data

        SportsCache.set_team_matches(
            team_id,
            data,
            page,
        )

        return Response({
            "count": len(data),
            "results": data,
            "cached": False,
        })