# notifications/models.py
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Notification(models.Model):
    TYPES = [
        ("like", "Like"),
        ("comment", "Comment"),
        ("follow", "Follow"),
        ("star", "Star"),
        ("share", "Share"),
        ("repost", "Repost"),
        ("message", "Message"),
        ("video", "Video"),
        ("starred", "Starred"),
    ]

    recipient = models.ForeignKey(User, related_name="notifications", on_delete=models.CASCADE)
    actors = models.ManyToManyField(User, related_name="acted_notifications")
    type = models.CharField(max_length=20, choices=TYPES)
    message = models.TextField()
    post = models.ForeignKey(
        "post.Post",
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type} -> {self.recipient}"
