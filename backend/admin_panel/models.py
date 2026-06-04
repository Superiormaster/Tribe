from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

User = get_user_model()

class AdminActionLog(models.Model):
    admin = models.ForeignKey(User, on_delete=models.CASCADE)
    action_type = models.CharField(max_length=100)  # BAN_USER, DELETE_POST
    target_id = models.IntegerField()
    target_type = models.CharField(max_length=100)  # user, post, tribe
    reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)