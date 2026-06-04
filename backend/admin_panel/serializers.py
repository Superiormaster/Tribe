from users.models import User
from rest_framework import serializers
from feedback.models import Report
from communities.models import TribeRequest

class TribeRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = TribeRequest
        fields = '__all__'


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'