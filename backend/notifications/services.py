from django.utils.timezone import now
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification
from .serializers import NotificationSerializer
from .push import push_notification


def create_notification(
    *,
    type,
    recipient,
    actors,
    post=None,
    community=None,
    tribe_request=None,
    group_key=None,
    merge_window_hours=6
):

    print("========== CREATE_NOTIFICATION ==========")
    print("type:", type)

    if not actors:
        return None

    actor = actors[0]

    # Don't notify yourself
    if recipient.id == actor.id:
        return None
    
    settings = getattr(
        recipient,
        "notification_settings",
        None
    )
    
    if settings and not settings.notifications_enabled:
        return None

    # =========================
    # AUTO GROUP KEY
    # =========================
    if not group_key:

        if post:
            group_key = f"{type}:post:{post.id}"

        elif community:
            group_key = f"{type}:community:{community.id}"

        else:
            group_key = f"{type}:{recipient.id}"

    # =========================
    # MERGE WINDOW
    # =========================
    window = now() - timedelta(hours=merge_window_hours)

    notif = Notification.objects.filter(
        recipient=recipient,
        group_key=group_key,
        updated_at__gte=window
    ).first()

    # =========================
    # UPDATE EXISTING
    # =========================
    if notif:

        existing_actor_ids = notif.actors.values_list(
            "id",
            flat=True
        )
        
        new_actors = [
            actor for actor in actors
            if actor.id not in existing_actor_ids
        ]
        
        if new_actors:
            notif.count += len(new_actors)
            notif.actors.add(*new_actors)

        notif.save()

    else:

        notif = Notification.objects.create(
            recipient=recipient,
            type=type,
            post=post,
            community=community,
            tribe_request=tribe_request,
            group_key=group_key,
            count=1,
            message=""
        )

        notif.actors.add(*actors)

    # =========================
    # REALTIME SOCKET PUSH
    # =========================
    channel_layer = get_channel_layer()

    serialized = NotificationSerializer(notif).data

    print("Sending websocket notification")
    async_to_sync(channel_layer.group_send)(
        f"notifications_{recipient.id}",
        {
            "type": "send_notification",
            "data": serialized
        }
    )
  
    print("Recipient token:", getattr(recipient, "fcm_token", None))
    print("===============================")
    # push notification
    token = getattr(
        recipient,
        "fcm_token",
        None,
    )
  
    thumbnail = ""

    if post:
        media = post.media_files.filter(
            media_type="video"
        ).first() or post.media_files.filter(
            media_type="image"
        ).first()
    
        if media:
            thumbnail = media.thumbnail or media.file
  
    if token:
        try:
          print("Calling push_notification()")
          push_notification(
              token,
              recipient.id,
              {
                  "id":
                      notif.id,
      
                  "type":
                      notif.type,
      
                  "title":
                      "Tribe",
      
                  "body":
                      serialized["message"],
      
                  "postId":
                      str(post.id)
                      if post
                      else "",
      
                  "userId":
                      str(actor.id),
      
                  "thumbnail": thumbnail,
      
                  "communityCover": community.cover_image if community else "",
              },
          )
        except Exception as e:
          print("Push notification failed:", e)
    
    return notif