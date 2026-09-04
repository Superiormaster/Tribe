from rest_framework import serializers

from sports.models import Player


class PlayerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = [
            "id",
            "provider_id",
            "name",
            "first_name",
            "last_name",
            "photo",
            "position",
            "number",
            "nationality",
        ]


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = [
            "id",
            "provider_id",
            "name",
            "first_name",
            "last_name",
            "photo",
            "position",
            "number",
            "nationality",
            "age",
            "height",
            "weight",
            "birth_date",
            "birth_place",
        ]