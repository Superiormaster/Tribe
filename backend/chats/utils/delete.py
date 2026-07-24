from django.utils import timezone
from django.core.exceptions import PermissionDenied

from chats.models import (
    Message,
)

def soft_delete_message(message, user):
    chat = message.chat

    is_admin = chat.is_chat_admin(user)
    is_owner = message.sender_id == user.id

    if not is_owner and not is_admin:
        raise PermissionDenied("No permission to delete this message")

    message.is_deleted = True
    message.deleted_at = timezone.now()

    if chat.chat_type == "community" and is_admin and not is_owner:
        message.deleted_by_admin = True
        message.text = "Deleted by administrator"
    else:
        message.text = "Deleted message"

    message.encrypted_text = ""
    message.media_url = None
    message.thumbnail = None
    message.reply_to = None
    message.save()
    
    if chat.last_message_id == message.id:
        last_message = (
            Message.objects.filter(
                chat=chat,
                is_deleted=False
            )
            .exclude(id=message.id)
            .order_by("-created_at")
            .first()
        )
    
        chat.last_message = last_message
        chat.save(update_fields=["last_message"])