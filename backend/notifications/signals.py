from django.db.models.signals import post_save
from django.dispatch import receiver
from post.models import Like, Comment
from users.models import Star, ConnectionRequest
from .models import Notification, NotificationSettings
from django.contrib.auth import get_user_model
from .services import create_notification

User = get_user_model()


@receiver(post_save, sender=User)
def create_notification_settings(
    sender,
    instance,
    created,
    **kwargs
):
    if created:
        NotificationSettings.objects.create(
            user=instance
        )

# --- LIKE SIGNAL ---
@receiver(post_save, sender=Like)
def create_like_notification(
    sender,
    instance,
    created,
    **kwargs
):
    if not created:
        return

    if instance.post.user == instance.user:
        return

    create_notification(
        type="like",
        recipient=instance.post.user,
        actors=[instance.user],
        post=instance.post,
    )


# --- COMMENT SIGNAL ---
@receiver(post_save, sender=Comment)
def create_comment_notification(
    sender,
    instance,
    created,
    **kwargs
):
    if not created:
        return

    if instance.post.user == instance.user:
        return

    create_notification(
        type="comment",
        recipient=instance.post.user,
        actors=[instance.user],
        post=instance.post,
    )

# --- STAR / FOLLOW SIGNAL ---
@receiver(post_save, sender=Star)
def create_star_notification(
    sender,
    instance,
    created,
    **kwargs
):
    if not created:
        return

    if instance.star == instance.starred_user:
        return

    create_notification(
        type="star",
        recipient=instance.starred_user,
        actors=[instance.star],
    )

@receiver(post_save, sender=ConnectionRequest)
def create_connection_request_notification(sender, instance, created, **kwargs):

    if created:
        create_notification(
            type="connection_request",
            recipient=instance.to_user,
            actors=[instance.from_user],
        )

    elif instance.status == "accepted":
        create_notification(
            type="connection_accepted",
            recipient=instance.from_user,
            actors=[instance.to_user],
        )