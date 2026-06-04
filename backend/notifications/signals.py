from django.db.models.signals import post_save
from django.dispatch import receiver
from post.models import Like, Comment
from users.models import Star
from .models import Notification

# --- LIKE SIGNAL ---
@receiver(post_save, sender=Like)
def create_like_notification(sender, instance, created, **kwargs):
    post = instance.post
    user = instance.user

    # Don't notify if the user liked their own post
    if post.user == user:
        return

    # Aggregate likes for the same post
    notif, created_notif = Notification.objects.get_or_create(
        recipient=post.user,
        post=post,
        type="like",
        defaults={"message": f"{user.username} liked your post"}
    )

    notif.actors.add(user)

    # Update message to show multiple actors (max 3 for display)
    actor_usernames = [actor.username for actor in notif.actors.all()[:3]]
    notif.message = f"{', '.join(actor_usernames)} liked your post"
    notif.save()


# --- COMMENT SIGNAL ---
@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    if not created:
        return

    post = instance.post
    user = instance.user

    if post.user == user:
        return

    notif, created_notif = Notification.objects.get_or_create(
        recipient=post.user,
        post=post,
        type="comment",
        defaults={"message": f"{user.username} commented on your post"}
    )

    notif.actors.add(user)
    actor_usernames = [actor.username for actor in notif.actors.all()[:3]]
    notif.message = f"{', '.join(actor_usernames)} commented on your post"
    notif.save()


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

    # remove existing duplicate notifications
    old_notifications = Notification.objects.filter(
        recipient=instance.starred_user,
        type="star"
    )

    for notif in old_notifications:

        actor_ids = list(
            notif.actors.values_list(
                "id",
                flat=True
            )
        )

        if actor_ids == [instance.star.id]:
            notif.delete()

    # create fresh notification
    notification = Notification.objects.create(
        recipient=instance.starred_user,
        type="star"
    )

    notification.actors.add(
        instance.star
    )