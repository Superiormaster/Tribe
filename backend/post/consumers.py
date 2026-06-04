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

    async def receive(self, text_data):

        data = json.loads(text_data)

        # attach sender info safely
        data["sender"] = {
            "id": self.user.id,
            "username": self.user.username,
        }

        # broadcast
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "new_comment",
                "comment": data,
            }
        )

    async def new_comment(self, event):

        await self.send(
            text_data=json.dumps(event["comment"])
        )