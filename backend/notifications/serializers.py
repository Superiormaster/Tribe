# notifications/serializers.py
from rest_framework import serializers
from .models import Notification, UserNotificationPreference, DevicePushToken
from users.serializers import UserSerializer
from communities.models import Community
from users.utils import get_user_avatar
from notifications.recommendations.models import UserRecommendation
from notifications.services.recommendation_push import build_recommendation_payload

class NotificationSerializer(serializers.ModelSerializer):
    actors = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    community = serializers.SerializerMethodField()
    community_cover = (
        serializers.SerializerMethodField()
    )
    post_content_type = serializers.SerializerMethodField()
    thumbnail = (
        serializers.SerializerMethodField()
    )

    avatar = (
        serializers.SerializerMethodField()
    )

    recommendation_type = (
        serializers.CharField(
            read_only=True
        )
    )

    link = (
        serializers.SerializerMethodField()
    )
  
    recommendation = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "message",
            "post",
            "group_key",
            "count",
            "actors",
            "avatar",

            "thumbnail",

            "community",
            "community_cover",

            "recommendation",
            "recommendation_type",

            "link",
            "read",
            "post_content_type",
            "created_at",
            "community"
        ]

    def get_actors(self, obj):
        actors = obj.actors.all()[:3]  # show up to 3 users
        return [{"id": u.id, "username": u.username, "avatar": get_user_avatar(u) if u else None} for u in actors]

    def get_post_content_type(self, obj):
        if obj.post:
            return obj.post.content_type
        return None

    def get_avatar(self, obj):
      if obj.type == "recommendation":
          if (
              obj.recommendation_type
              == "people"
          ):
  
              actor = (
                  obj.actors.first()
              )
  
              if actor:
                  return (
                      get_user_avatar(actor)
                      or ""
                  )
  
              return ""
  
          if (
              obj.recommendation_type
              == "post"
          ):
              return ""
  
          if (
              obj.recommendation_type
              == "community"
          ):
              return ""
  
      actor = (
          obj.actors.first()
      )
  
      if actor:
          return (
              get_user_avatar(actor)
              or ""
          )
  
      return ""
  
    def get_community(self, obj):

        if not obj.community:
            return None
    
        return obj.community.id

    def get_community_cover(
        self,
        obj,
    ):
        community = obj.community

        if not community:
            return ""

        if (
            community.cover_image_asset
        ):
            return (
                community
                .cover_image_asset
                .original_url
                or ""
            )

        return (
            community.cover_image
            or ""
        )

    def get_thumbnail(
        self,
        obj,
    ):
        if not obj.post:
            return ""

        media = (
            obj.post.media_files
            .filter(
                media_type__in=[
                    "image",
                    "video",
                ]
            )
            .first()
        )

        if not media:
            return ""

        if media.asset:
            return (
                media.asset.thumbnail_url
                or media.asset.original_url
                or ""
            )

        return (
            media.thumbnail
            or media.file
            or ""
        )

    def get_link(
        self,
        obj,
    ):
        actor = (
            obj.actors
            .order_by("id")
            .first()
        )

        from notifications.services.recommendation_push import (
            get_notification_link,
        )

        return get_notification_link(
            obj,
            actor=actor,
        )

    def get_recommendation(self, obj):

      if obj.type != "recommendation":
          return None
  
      actor = (
          obj.actors
          .order_by("id")
          .first()
      )
  
      payload = build_recommendation_payload(
          notification=obj,
          actor=actor,
      )
  
      return payload
  
    def get_message(self, obj):
        actors = list(obj.actors.all()[:3])

        first_actor = (
            actors[0].username
            if actors else "Someone"
        )
    
        others_count = obj.count - 1

        def format_text(action):

            if obj.count <= 1:
                return f"{first_actor} {action}"

            return (
                f"{first_actor} and "
                f"{others_count} others "
                f"{action}"
            )

        # ---------------------------
        # POST BASED NOTIFICATIONS
        # ---------------------------
        if obj.type == "like":
            if obj.community:
                return format_text(f"liked your post in {obj.community.name} community")
            return format_text("liked your post")
    
        if obj.type == "comment_like":

            if obj.community:
                return format_text(
                    f"liked your comment in {obj.community.name} community"
                )
        
            return format_text(
                "liked your comment"
            )

        if obj.type == "comment":
            if obj.community:
                return format_text(f"commented on your post in {obj.community.name} community")
            return format_text("commented on your post")
    
        if obj.type == "reply":
            if obj.community:
                return format_text(
                    f"replied to your comment in {obj.community.name} community"
                )
        
            return format_text(
                "replied to your comment"
            )

        if obj.type == "star":
            return format_text("starred you")

        if obj.type == "bookmark":
            if obj.community:
                return format_text(f"bookmarked your post in {obj.community.name} community.")
            return format_text(f"bookmarked your post.")

        if obj.type == "share":
            if obj.community:
                return format_text(f"shared your post in {obj.community.name} community.")
            return format_text(f"shared your post.")
    
        if obj.type == "repost":
            if obj.community:
                return format_text(f"reposted your post in {obj.community.name} community")
            return format_text(f"reposted your post")

        # ---------------------------
        # CONNECTION SYSTEM
        # ---------------------------
        if obj.type == "connection_request":
            return (
                f"{first_actor} "
                f"sent you a connection request"
            )
    
        if obj.type == "connection_accept":
            return (
                f"You are now connected "
                f"with {first_actor}"
            )
    
        if obj.type == "connection_declined":
            return (
                f"{first_actor} declined "
                f"your connection request"
            )

        if obj.type == "recommendation":

          if obj.message:
              return obj.message
      
          if (
              obj.recommendation_type
              == "people"
          ):
      
              return (
                  "You might know this person"
              )
      
          if (
              obj.recommendation_type
              == "post"
          ):
      
              return (
                  "A post you might be interested in"
              )
      
          if (
              obj.recommendation_type
              == "community"
          ):
      
              return (
                  "A community you might be interested in"
              )
  
        # ---------------------------
        # COMMUNITY
        # ---------------------------
        if obj.type == "community":
            return format_text(f"interacted with your {obj.community.name} community")

        if obj.type == "invite":
            return (
                f"{first_actor} invited you "
                f"to join {obj.community.name} community"
            )

        if obj.type == "invite_accept":
            return (
                f"{first_actor} joined "
                f"{obj.community.name} community"
            )

        if obj.type == "approval":
            return (
                f"Admin approved your post "
                f"in {obj.community.name} community"
            )
  
        if obj.type == "post_deleted_by_admin":
            return (
                f"Admin deleted your post "
                f"in {obj.community.name} community"
            )

        if obj.type == "join_request":
            return f"{first_actor} requested to join {obj.community.name} community"
  
        if obj.type == "join_approved":
            return f"Your request to join {obj.community.name} community was approved 🎉"
  
        if obj.type == "join_rejected":
            return f"Your request to join {obj.community.name} community was rejected"
  
        if obj.type == "community_ban":
            return f"You were banned from {obj.community.name} community"
  
        if obj.type == "community_unban":
            return f"You can access {obj.community.name} community again"

        if obj.type == "community_removed":
            return f"You were removed from {obj.community.name} community"
  
        if obj.type == "moderator_added":
            return f"You were made a moderator in {obj.community.name} community"
        
        if obj.type == "admin_added":
            return f"You were made an admin in {obj.community.name} community"
  
        if obj.type == "role_removed":
            return f"Your staff role was removed in {obj.community.name} community"
  
        if obj.type == "post_approved":
            return f"Your post was approved in {obj.community.name} community"
  
        if obj.type == "post_rejected":
            return f"Your post was rejected in {obj.community.name} community"

        if obj.type == "tribe_request_approved":
            tribe = (
                obj.tribe_request.name
                if obj.tribe_request
                else "your"
            )
        
            return (
                f"Your request for the "
                f"{tribe} tribe has been approved 🎉"
            )

        if obj.type == "tribe_request_rejected":
            tribe = (
                obj.tribe_request.name
                if obj.tribe_request
                else "your"
            )
        
            return (
                f"Your request for the "
                f"{tribe} tribe has been rejected."
            )
  
        return obj.type.capitalize()

class DevicePushTokenSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = DevicePushToken

        fields = [
            "token",
            "platform",
            "browser",
        ]

class UserNotificationPreferenceSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = UserNotificationPreference
        fields = [
            "push_enabled",
            "social_notifications",
            "message_notifications",
            "community_notifications",
            "recommendation_notifications",
            "marketing_notifications",
            "quiet_hours_enabled",
            "quiet_hours_start",
            "quiet_hours_end",
            "updated_at",
        ]

        read_only_fields = [
            "updated_at",
        ]

class UserRecommendationSerializer(
    serializers.ModelSerializer
):

    user_id = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    post_id = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    community_id = serializers.SerializerMethodField()
    community_name = serializers.SerializerMethodField()
    community_cover = serializers.SerializerMethodField()

    class Meta:

        model = UserRecommendation

        fields = (
            "id",
            "recommendation_type",

            "user_id",
            "username",
            "avatar",

            "post_id",
            "thumbnail",

            "community_id",
            "community_name",
            "community_cover",

            "score",
            "reason",

            "seen",
            "dismissed",
            "created_at",
        )

    def get_user_id(self, obj):

        if obj.recommended_user:
            return str(
                obj.recommended_user.id
            )

        return ""

    def get_username(self, obj):

        if obj.recommended_user:
            return (
                obj.recommended_user.username
                or ""
            )

        return ""

    def get_avatar(self, obj):

        if obj.recommended_user:

            return (
                get_user_avatar(
                    obj.recommended_user
                )
                or ""
            )

        if obj.recommendation_type == "post":

            if obj.post and obj.post.user:

                return (
                    get_user_avatar(
                        obj.post.user
                    )
                    or ""
                )

        if obj.recommendation_type == "community":

            return self.get_community_cover(
                obj
            )

        return ""

    def get_post_id(self, obj):

        if obj.post:
            return str(obj.post.id)

        return ""

    def get_thumbnail(self, obj):

        if not obj.post:
            return ""

        media = (
            obj.post.media_files
            .filter(
                media_type__in=[
                    "image",
                    "video",
                ]
            )
            .first()
        )

        if not media:
            return ""

        if media.asset:

            return (
                media.asset.thumbnail_url
                or media.asset.original_url
                or ""
            )

        return (
            media.thumbnail
            or media.file
            or ""
        )

    def get_community_id(self, obj):

        if obj.community:
            return str(
                obj.community.id
            )

        return ""

    def get_community_name(self, obj):

        if obj.community:
            return (
                obj.community.name
                or ""
            )

        return ""

    def get_community_cover(self, obj):

        if not obj.community:
            return ""

        community = obj.community

        if community.cover_image_asset:

            return (
                community
                .cover_image_asset
                .original_url
                or ""
            )

        return (
            community.cover_image
            or ""
        )