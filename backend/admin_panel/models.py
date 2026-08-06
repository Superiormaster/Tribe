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

class ContactReply(models.Model):

    contact = models.ForeignKey(
        "feedback.ContactMessage",
        related_name="replies",
        on_delete=models.CASCADE,
    )

    message = models.TextField()

    sent_by = models.ForeignKey(
        User,
        related_name="contact_replies",
        on_delete=models.SET_NULL,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )


    class Meta:
        ordering = [
            "-created_at"
        ]


    def __str__(self):
        return f"Reply to {self.contact.email}"