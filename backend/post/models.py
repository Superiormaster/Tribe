from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from communities.models import Community

User = get_user_model()

class Post(models.Model):
    CONTENT_TYPES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('short_video', 'Short Video'),
        ('long_video', 'Long Video'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    caption = models.TextField(blank=True, null=True)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    community = models.ForeignKey(
        "communities.Community",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='posts'
    )
    replay_count = models.IntegerField(default=0)
    skipped_views = models.IntegerField(default=0)
    views_count = models.PositiveIntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    is_rejected = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)

    profile_pinned = models.BooleanField(default=False)
    profile_pin_order = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    # COMMUNITY PIN
    community_pinned = models.BooleanField(default=False)
    community_pin_order = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    # future drag/drop support
    pin_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if (
            self.content_type == 'short_video'
            and self.community
            and not self.community.tribe.allow_reels
        ):
            raise ValidationError("Short videos (reels) only allowed in specific tribes.")

    def __str__(self):
        if self.community:
            return f"{self.user.username} - {self.content_type} in {self.community.name}"
        return f"{self.user.username} - {self.content_type}"

    class Meta:
      indexes = [
          # PROFILE PIN QUERY OPTIMIZATION
          models.Index(fields=["user", "profile_pinned", "profile_pin_order"]),
  
          # COMMUNITY PIN QUERY OPTIMIZATION
          models.Index(fields=["community", "community_pinned", "community_pin_order"]),
  
          # GENERAL FEED PERFORMANCE
          models.Index(fields=["user", "created_at"]),
          models.Index(fields=["community", "created_at"]),
  
          # OPTIONAL: pinned filter fast lookup
          models.Index(fields=["profile_pinned"]),
          models.Index(fields=["community_pinned"]),
      ]


class PostView(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="views")
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    watch_time = models.FloatField(default=0)
    completed = models.BooleanField(default=False)
    skipped = models.BooleanField(default=False)
    replay_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    last_viewed_at = models.DateTimeField(auto_now=True)


class PostMedia(models.Model):
    MEDIA_TYPES = (
        ('image', 'Image'),
        ('video', 'Video')
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='media_files'
    )
    file = models.URLField()
    thumbnail = models.URLField(blank=True, null=True)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)

    def __str__(self):
        return f"{self.media_type} for post {self.post.id}"


class Like(models.Model):
    post = models.ForeignKey(Post, related_name='likes', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')

    def __str__(self):
        return f"{self.user.username} liked {self.post.id}"


class Comment(models.Model):
    post = models.ForeignKey(Post, related_name='comments', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField()
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        related_name='replies',
        on_delete=models.CASCADE
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def get_root_parent(self):
      if self.parent is None:
          return self
      return self.parent.get_root_parent()

    def __str__(self):
        return f"{self.user.username} commented on {self.post.id}"


class CommentLike(models.Model):
    comment = models.ForeignKey(
        "Comment",
        related_name="likes",
        on_delete=models.CASCADE
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("comment", "user")

    def __str__(self):
        return f"{self.user.username} liked comment {self.comment.id}"


class Share(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="shares")
    platform = models.CharField(max_length=50, default="unknown")
    created_at = models.DateTimeField(auto_now_add=True)


class Feed(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class Repost(models.Model):
    REPOST_TYPES = (
        ("normal", "Normal Repost"),
        ("quote", "Quote Repost"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="reposts")
    community = models.ForeignKey(
        Community,
        on_delete=models.CASCADE,
        related_name="reposts",
        null=True,
        blank=True
    )

    repost_type = models.CharField(
        max_length=10,
        choices=REPOST_TYPES,
        default="normal"
    )

    quote_text = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "post", "repost_type")