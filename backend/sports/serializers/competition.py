from rest_framework import serializers

from sports.models import Competition


class CompetitionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = [
            "id",
            "provider_id",
            "name",
            "type",
            "logo",
            "country",
        ]


class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = [
            "id",
            "provider_id",
            "name",
            "type",
            "logo",
            "country",
            "country_code",
            "founded",
            "is_major",
        ]