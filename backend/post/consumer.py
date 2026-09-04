import json
from channels.generic.websocket import AsyncWebsocketConsumer

class FeedConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        print("🔥 FEED CONNECT STARTED")

        user = self.scope.get("user")

        print(
            "🔥 FEED USER:",
            user,
            "anonymous:",
            getattr(user, "is_anonymous", None)
        )

        if not user or user.is_anonymous:
            print("❌ FEED WS UNAUTHENTICATED")
            await self.close(code=4001)
            return

        self.user = user

        kwargs = self.scope["url_route"]["kwargs"]

        print("🔥 FEED KWARGS:", kwargs)

        community_id = kwargs.get("community_id")
        profile_user_id = kwargs.get("user_id")

        if community_id:
            self.room_group_name = (
                f"feed_community_{community_id}"
            )

        elif profile_user_id:
            self.room_group_name = (
                f"feed_profile_{profile_user_id}"
            )

        else:
            self.room_group_name = "feed_global"

        print(
            "🔥 FEED GROUP:",
            self.room_group_name
        )

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        print("🔥 FEED GROUP ADD SUCCESS")

        await self.accept()

        print("✅ FEED WS ACCEPTED")

    async def disconnect(self, close_code):

        print(
            "🔥 FEED DISCONNECT:",
            close_code
        )

        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def post_stats(self, event):

      print("🔥🔥 FEED CONSUMER RECEIVED POST STATS:", event)
  
      payload = {
          "type": "post_stats",
          "post_id": event["post_id"],
          "likes_count": event.get("likes_count"),
          "comments_count": event.get("comments_count"),
          "shares_count": event.get("shares_count"),
          "views_count": event.get("views_count"),
      }
  
      print("📤 FEED WS SENDING TO CLIENT:", payload)
  
      await self.send(
          text_data=json.dumps(payload)
      )
  
      print("✅ FEED WS SEND COMPLETE")

    async def new_comment(self, event):

        await self.send(
            text_data=json.dumps({
                "type": "new_comment",
                "post_id": event["post_id"],
                "comment": event.get("comment"),
                "comments_count": event.get("comments_count"),
            })
        )

    async def comment_deleted(self, event):

        await self.send(
            text_data=json.dumps({
                "type": "comment_deleted",
                "post_id": event["post_id"],
                "comment_id": event["comment_id"],
                "comments_count": event.get("comments_count"),
            })
        )

    async def comment_updated(self, event):

        await self.send(
            text_data=json.dumps({
                "type": "comment_updated",
                "post_id": event["post_id"],
                "comment": event.get("comment"),
            })
        )