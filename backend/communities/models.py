# communities/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class Tribe(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    allow_reels = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Community(models.Model):
    name = models.CharField(max_length=255, unique=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_communities')
    moderators = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='moderated_communities', blank=True)
    description = models.TextField(blank=True, null=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='communities', blank=True)
    cover_image = models.URLField(default="https://res.cloudinary.com/demo/image/upload/default.png", blank=True)
    intro_video = models.URLField(blank=True, null=True)
    require_post_approval = models.BooleanField(default=False)
    tribe = models.ForeignKey(Tribe, null=True, on_delete=models.SET_NULL, related_name="communities")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Report(models.Model):
    post = models.ForeignKey("post.Post", on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    reason = models.TextField()