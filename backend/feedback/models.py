from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from communities.models import Tribe
from post.models import Post

User = get_user_model()

class Feedback(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class Report(models.Model):
    REPORT_TYPES = (
        ('user', 'User'),
        ('post', 'Post'),
        ('tribe', 'Tribe'),
    )

    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    target_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)
    target_post = models.ForeignKey(Post, null=True, blank=True, on_delete=models.CASCADE)
    target_tribe = models.ForeignKey(Tribe, null=True, blank=True, on_delete=models.CASCADE)

    reason = models.TextField()
    status = models.CharField(default='pending', max_length=20)  # pending, resolved, ignored
    created_at = models.DateTimeField(auto_now_add=True)