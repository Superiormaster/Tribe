from rest_framework import serializers

from sports.models import Standing
from .team import TeamListSerializer


class StandingSerializer(serializers.ModelSerializer):
    team = TeamListSerializer(read_only=True)

    class Meta:
        model = Standing
        fields = [
            "id",
            "rank",
            "team",
            "played",
            "wins",
            "draws",
            "losses",
            "goals_for",
            "goals_against",
            "goal_difference",
            "points",
            "home_played",
            "home_wins",
            "home_draws",
            "home_losses",
            "away_played",
            "away_wins",
            "away_draws",
            "away_losses",
            "form",
            "description",
            "group_name",
            "group_index",
        ]