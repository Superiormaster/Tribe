# comments/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CommentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.post_id = self.scope['url_route']['kwargs']['post_id']
        self.room_group_name = f'post_{self.post_id}'

        # Join group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        # Broadcast to group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'new_comment',
                'comment': data
            }
        )

    # Receive message from group
    async def new_comment(self, event):
        comment = event['comment']

        # Send to WebSocket
        await self.send(text_data=json.dumps(comment))