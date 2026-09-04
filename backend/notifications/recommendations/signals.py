from django.db.models.signals import post_save
from django.dispatch import receiver

from post.models import Like

from .interests import update_interests
from .scoring import interaction_weight


@receiver(
    post_save,
    sender=Like,
)
def like_interest_signal(
    sender,
    instance,
    created,
    **kwargs,
):

    if not created:
        return

    post = instance.post

    topics = post.topics or []

    if not topics:
        return

    update_interests(
        user=instance.user,
        topics=topics,
        weight=interaction_weight("like"),
    )