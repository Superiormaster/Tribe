# comments/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer


class CommentConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        # authenticated user from JWT middleware
        user = self.scope.get("user")

        # reject unauthenticated users
        if not user or user.is_anonymous:
            await self.close(code=4001)
            return

        self.user = user

        self.post_id = self.scope["url_route"]["kwargs"]["post_id"]

        self.room_group_name = f"post_{self.post_id}"

        # join room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):

        if hasattr(self, "room_group_name"):

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def new_comment(self, event):
      await self.send(text_data=json.dumps({
          "type": "new_comment",
          "post_id": event["post_id"],
          "comment": event["comment"],
          "comments_count": event["comments_count"],
      }))
  
    async def comment_deleted(self, event):
      await self.send(text_data=json.dumps({
          "type": "comment_deleted",
          "post_id": event["post_id"],
          "comment_id": event["comment_id"],
          "comments_count": event["comments_count"],
      }))
  
    async def comment_updated(self, event):
      await self.send(text_data=json.dumps({
          "type": "comment_updated",
          "post_id": event["post_id"],
          "comment": event["comment"],
      }))
  
    async def post_stats(self, event):
        await self.send(text_data=json.dumps({
            "type": "post_stats",
            "post_id": event["post_id"],
            "likes_count": event["likes_count"],
            "comments_count": event["comments_count"],
            "shares_count": event["shares_count"],
            "views_count": event["views_count"],
        }))