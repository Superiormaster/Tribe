from django.utils import timezone

from rest_framework.response import Response
from rest_framework.views import APIView

from sports.models import Match
from sports.serializers import MatchListSerializer
from sports.services.cache import SportsCache


class FixturesView(APIView):
    """
    GET /api/sports/fixtures/

    Optional:

        ?date=2026-08-20
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

        cache_key = (
            SportsCache.fixtures_key(
                date=date,
                competition_id=(
                    int(competition_id)
                    if competition_id
                    and competition_id.isdigit()
                    else None
                ),
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
                scheduled_at__date=date
            )
            .select_related(
                "home_team",
                "away_team",
                "competition",
                "season",
            )
            .order_by(
                "scheduled_at"
            )
        )

        if competition_id:
            if not competition_id.isdigit():
                return Response(
                    {
                        "detail": (
                            "Invalid competition."
                        )
                    },
                    status=400,
                )

            queryset = queryset.filter(
                competition__provider_id=(
                    int(competition_id)
                )
            )

        data = MatchListSerializer(
            queryset,
            many=True,
        ).data

        SportsCache.set_json(
            cache_key,
            data,
            SportsCache.TTL_FIXTURES,
        )

        return Response({
            "date": date,
            "count": len(data),
            "results": data,
            "cached": False,
        })