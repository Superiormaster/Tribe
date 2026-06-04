# signals.py
@receiver(post_save, sender=CommunityInvite)
def invite_created(sender, instance, created, **kwargs):
    if created:
        notify_user(instance)