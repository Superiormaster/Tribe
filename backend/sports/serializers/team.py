from rest_framework import serializers

from sports.models import Team


class TeamListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = [
            "id",
            "provider_id",
            "name",
            "short_name",
            "code",
            "logo",
            "country",
        ]


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = [
            "id",
            "provider_id",
            "name",
            "short_name",
            "code",
            "logo",
            "country",
            "founded",
            "venue_name",
            "venue_city",
            "venue_capacity",
        ]