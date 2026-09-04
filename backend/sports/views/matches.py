from __future__ import annotations

from django.core.cache import cache
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from sports.models import Match

from sports.serializers import (
    MatchListSerializer,
    MatchSerializer,
)

from sports.services.cache import SportsCache


class TodayMatchesView(APIView):
    """
    GET /api/sports/matches/today/

    Returns today's fixtures/results.

    Redis
        ↓
    PostgreSQL
        ↓
    Response

    The external provider is NOT called here.
    Celery keeps the database updated.
    """

    def get(self, request):
        date = timezone.localdate()
        date_string = str(date)

        cached = (
            SportsCache.get_today_matches(
                date_string
            )
        )

        if cached is not None:
            return Response({
                "date": date_string,
                "count": len(cached),
                "results": cached,
                "cached": True,
            })

        matches = (
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

        data = MatchListSerializer(
            matches,
            many=True,
        ).data

        SportsCache.set_today_matches(
            date_string,
            data,
        )

        return Response({
            "date": date_string,
            "count": len(data),
            "results": data,
            "cached": False,
        })


class LiveMatchesView(APIView):
    """
    GET /api/sports/matches/live/

    Returns currently live matches.

    Redis is checked first.
    """

    def get(self, request):

        cached = (
            SportsCache.get_live_matches()
        )

        if cached is not None:
            return Response({
                "count": len(cached),
                "results": cached,
                "cached": True,
            })

        matches = (
            Match.objects
            .filter(
                is_live=True
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

        data = MatchListSerializer(
            matches,
            many=True,
        ).data

        SportsCache.set_live_matches(
            data
        )

        return Response({
            "count": len(data),
            "results": data,
            "cached": False,
        })


class MatchDetailView(APIView):
    """
    GET /api/sports/matches/<match_id>/
    """

    def get(
        self,
        request,
        match_id,
    ):

        cached = (
            SportsCache.get_match(
                match_id
            )
        )

        if cached is not None:
            return Response({
                "result": cached,
                "cached": True,
            })

        match = (
            Match.objects
            .filter(
                provider_id=match_id
            )
            .select_related(
                "home_team",
                "away_team",
                "competition",
                "season",
            )
            .prefetch_related(
                "events",
                "statistics",
                "lineups",
            )
            .first()
        )

        if not match:
            return Response(
                {
                    "detail": (
                        "Match not found."
                    )
                },
                status=404,
            )

        data = MatchSerializer(
            match
        ).data

        timeout = (
            SportsCache.TTL_LIVE
            if match.is_live
            else SportsCache.TTL_MATCH
        )

        SportsCache.set_match(
            match_id,
            data,
            timeout=timeout,
        )

        return Response({
            "result": data,
            "cached": False,
        })

class MatchEventsView(APIView):
    """
    GET /api/sports/matches/<match_id>/events/
    """

    def get(
        self,
        request,
        match_id,
    ):
        cached = (
            SportsCache.get_match_events(
                match_id
            )
        )

        if cached is not None:
            return Response({
                "count": len(cached),
                "results": cached,
                "cached": True,
            })

        match = (
            Match.objects
            .filter(
                provider_id=match_id
            )
            .first()
        )

        if not match:
            return Response(
                {
                    "detail": (
                        "Match not found."
                    )
                },
                status=404,
            )

        events = match.events.all()

        from sports.serializers import (
            MatchEventSerializer,
        )

        data = MatchEventSerializer(
            events,
            many=True,
        ).data

        SportsCache.set_match_events(
            match_id,
            data,
        )

        return Response({
            "count": len(data),
            "results": data,
            "cached": False,
        })


class MatchStatisticsView(APIView):
    """
    GET /api/sports/matches/<match_id>/stats/
    """

    def get(
        self,
        request,
        match_id,
    ):
        cached = (
            SportsCache.get_match_stats(
                match_id
            )
        )

        if cached is not None:
            return Response({
                "count": len(cached),
                "results": cached,
                "cached": True,
            })

        match = (
            Match.objects
            .filter(
                provider_id=match_id
            )
            .first()
        )

        if not match:
            return Response(
                {
                    "detail": (
                        "Match not found."
                    )
                },
                status=404,
            )

        statistics = (
            match.statistics.all()
        )

        from sports.serializers import (
            MatchStatisticSerializer,
        )

        data = MatchStatisticSerializer(
            statistics,
            many=True,
        ).data

        SportsCache.set_match_stats(
            match_id,
            data,
        )

        return Response({
            "count": len(data),
            "results": data,
            "cached": False,
        })


class MatchLineupsView(APIView):
    """
    GET /api/sports/matches/<match_id>/lineups/
    """

    def get(
        self,
        request,
        match_id,
    ):
        cached = (
            SportsCache.get_match_lineups(
                match_id
            )
        )

        if cached is not None:
            return Response({
                "count": len(cached),
                "results": cached,
                "cached": True,
            })

        match = (
            Match.objects
            .filter(
                provider_id=match_id
            )
            .first()
        )

        if not match:
            return Response(
                {
                    "detail": (
                        "Match not found."
                    )
                },
                status=404,
            )

        lineups = (
            match.lineups.all()
        )

        from sports.serializers import (
            MatchLineupSerializer,
        )

        data = MatchLineupSerializer(
            lineups,
            many=True,
        ).data

        SportsCache.set_match_lineups(
            match_id,
            data,
        )

        return Response({
            "count": len(data),
            "results": data,
            "cached": False,
        })