from django.utils import timezone

from rest_framework.response import Response
from rest_framework.views import APIView

from sports.models import Match
from sports.serializers import MatchListSerializer
from sports.services.cache import SportsCache


class ResultsView(APIView):
    """
    GET /api/sports/results/

    Optional:

        ?date=2026-08-15
        ?competition=39
    """

    def get(self, request):

        date = request.query_params.get(
            "date"
        )

        competition_id = request.query_params.get(
            "competition"
        )

        if not date:
            date = str(
                timezone.localdate()
            )

        competition = None

        if (
            competition_id
            and competition_id.isdigit()
        ):
            competition = int(
                competition_id
            )

        cache_key = (
            SportsCache.results_key(
                date=date,
                competition_id=competition,
            )
        )

        cached = SportsCache.get_json(
            cache_key
        )

        if cached is not None:
            return Response({
                "results": cached,
                "cached": True,
            })

        queryset = (
            Match.objects
            .filter(
                scheduled_at__date=date,
            )
            .exclude(
                status_short__in=[
                    "NS",
                    "TBD",
                ]
            )
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

        if competition:
            queryset = queryset.filter(
                competition__provider_id=(
                    competition
                )
            )

        data = MatchListSerializer(
            queryset,
            many=True,
        ).data

        SportsCache.set_json(
            cache_key,
            data,
            SportsCache.TTL_RESULTS,
        )

        return Response({
            "date": date,
            "count": len(data),
            "results": data,
            "cached": False,
        })