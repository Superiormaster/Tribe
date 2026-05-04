from django.contrib.auth.backends import ModelBackend
from rest_framework.authentication import BaseAuthentication
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class EmailBackend(ModelBackend):
    def authenticate(self, request, email=None, password=None, **kwargs):
        if not email or not password:
            return None

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None

        if user.check_password(password):
            return user

        return None