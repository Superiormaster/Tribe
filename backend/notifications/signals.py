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
def create_star_notification(sender, instance, created, **kwargs):
    if not created:
        return

    follower = instance.star
    following = instance.starred_user

    if follower == following:
        return

    notif, created_notif = Notification.objects.get_or_create(
        recipient=following,
        type="star",
        defaults={"message": f"{follower.username} starred you"}
    )

    notif.actors.add(follower)
    actor_usernames = [actor.username for actor in notif.actors.all()[:3]]
    notif.message = f"{', '.join(actor_usernames)} starred you"
    notif.save()