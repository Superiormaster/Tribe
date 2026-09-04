from rest_framework import serializers

from sports.models import (
    Match,
    MatchEvent,
    MatchLineup,
    MatchTeamStatistics,
)

from .team import TeamListSerializer
from .competition import CompetitionListSerializer
from .player import PlayerListSerializer


class MatchEventSerializer(serializers.ModelSerializer):
    player = PlayerListSerializer(
        read_only=True
    )

    assist_player = PlayerListSerializer(
        read_only=True
    )

    class Meta:
        model = MatchEvent
        fields = [
            "id",
            "minute",
            "extra_minute",
            "type",
            "detail",
            "comments",
            "player",
            "assist_player",
            "team",
        ]


class MatchStatisticSerializer(serializers.ModelSerializer):
    team = TeamListSerializer(
        read_only=True
    )

    class Meta:
        model = MatchTeamStatistics
        fields = [
            "id",
            "team",
            "shots_on_target",
            "shots_off_target",
            "total_shots",
            "blocked_shots",
            "shots_inside_box",
            "shots_outside_box",
            "fouls",
            "corners",
            "offsides",
            "possession",
            "yellow_cards",
            "red_cards",
            "goalkeeper_saves",
            "passes",
            "passes_accurate",
            "passes_percentage",
        ]


class MatchLineupSerializer(serializers.ModelSerializer):
    player = PlayerListSerializer(
        read_only=True
    )

    team = TeamListSerializer(
        read_only=True
    )

    class Meta:
        model = MatchLineup
        fields = [
            "id",
            "team",
            "player",
            "position",
            "number",
            "formation",
            "is_starting",
            "is_substitute",
            "substitute_in_minute",
            "substitute_out_minute",
            "rating",
            "captain",
        ]


class MatchListSerializer(serializers.ModelSerializer):
    home_team = TeamListSerializer(
        read_only=True
    )

    away_team = TeamListSerializer(
        read_only=True
    )

    competition = CompetitionListSerializer(
        read_only=True
    )

    class Meta:
        model = Match
        fields = [
            "id",
            "provider_id",
            "home_team",
            "away_team",
            "competition",
            "scheduled_at",
            "status",
            "status_short",
            "elapsed",
            "home_score",
            "away_score",
            "home_halftime_score",
            "away_halftime_score",
            "home_fulltime_score",
            "away_fulltime_score",
            "home_extratime_score",
            "away_extratime_score",
            "is_live",
        ]


class MatchSerializer(MatchListSerializer):
    events = MatchEventSerializer(
        many=True,
        read_only=True,
    )

    statistics = MatchStatisticSerializer(
        many=True,
        read_only=True,
    )

    lineups = MatchLineupSerializer(
        many=True,
        read_only=True,
    )

    class Meta(MatchListSerializer.Meta):
        fields = MatchListSerializer.Meta.fields + [
            "venue_name",
            "venue_city",
            "referee",
            "timezone",
            "events",
            "statistics",
            "lineups",
        ]