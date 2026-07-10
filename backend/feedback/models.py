from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from communities.models import Tribe
from post.models import Post, Repost

User = get_user_model()

class Feedback(models.Model):
    FEEDBACK_CHOICES = (
        ("very_satisfied", "Very Satisfied"),
        ("satisfied", "Satisfied"),
        ("not_satisfied", "Not Satisfied"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    rating = models.CharField(
        max_length=30,
        choices=FEEDBACK_CHOICES,
        null=True,
        blank=True
    )

    message = models.TextField(
        blank=True
    )

    resolved = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

class Report(models.Model):
    REPORT_TYPES = (
        ("post", "Post"),
        ("user", "User"),
        ("message", "Message"),
        ("community", "Community"),
        ("comment", "Comment"),
    )

    REPORT_REASON_CHOICES = (
        ("spam", "Spam"),
        ("harassment", "Harassment"),
        ("hate_speech", "Hate Speech"),
        ("violence", "Violence"),
        ("nudity", "Nudity"),
        ("misinformation", "Misinformation"),
        ("copyright", "Copyright"),
        ("other", "Other"),
    )

    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reports_made'
    )

    report_type = models.CharField(max_length=20, choices=REPORT_TYPES, null=True, blank=True)

    target_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="user_reports"
    )

    target_post = models.ForeignKey(
        Post,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="post_reports"
    )

    target_repost = models.ForeignKey(
        Repost,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repost_reports"
    )

    target_message = models.ForeignKey(
        'chats.Message',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="message_reports"
    )

    target_community = models.ForeignKey(
        'communities.Community',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="community_reports"
    )

    target_comment = models.ForeignKey(
        'post.Comment',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comment_reports"
    )

    reason = models.CharField(max_length=30, choices=REPORT_REASON_CHOICES)

    details = models.TextField(blank=True, null=True)

    status = models.CharField(default='pending', max_length=20,
      choices=[
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("resolved", "Resolved"),
        ("ignored", "Ignored"),
      ]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
      indexes = [
          models.Index(fields=["report_type", "reason"]),
          models.Index(fields=["status"]),
      ]

      constraints = [
          models.UniqueConstraint(
              fields=["reporter", "target_post"],
              name="unique_post_report"
          ),
          models.UniqueConstraint(
              fields=["reporter", "target_message"],
              name="unique_message_report"
          ),
          models.UniqueConstraint(
              fields=["reporter", "target_user"],
              name="unique_user_report"
          ),
          models.UniqueConstraint(
              fields=["reporter", "target_community"],
              name="unique_community_report"
          ),
      ]

class ProblemReport(models.Model):
    REPORT_TYPES = (
        ("bug", "Bug"),
        ("feature", "Feature Request"),
        ("abuse", "Abuse"),
        ("content", "Inappropriate Content"),
        ("account", "Account Issue"),
        ("chat", "Messaging Issue"),
        ("payment", "Payment"),
        ("other", "Other"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    report_type = models.CharField(
        max_length=30,
        choices=REPORT_TYPES
    )

    message = models.TextField()

    status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            ("pending", "Pending"),
            ("reviewed", "Reviewed"),
            ("resolved", "Resolved"),
        ]
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )