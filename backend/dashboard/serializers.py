from rest_framework import serializers

class AnalyticsOverviewSerializer(serializers.Serializer):
    chart = serializers.DictField()
    summary = serializers.DictField()
    content = serializers.DictField()
    audience = serializers.DictField()
    topPosts = serializers.ListField()
    reels = serializers.DictField()
    communities = serializers.ListField()