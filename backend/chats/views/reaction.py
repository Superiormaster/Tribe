from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.db import transaction

from chats.models import (
    Message,
    MessageReaction,
)

def get_message_reaction_summary(message):
    reactions = (
        MessageReaction.objects
        .filter(message=message)
        .select_related("user")
        .order_by("emoji", "id")
    )

    grouped = {}

    for reaction in reactions:
        emoji = reaction.emoji

        if emoji not in grouped:
            grouped[emoji] = {
                "emoji": emoji,
                "count": 0,
                "users": [],
            }

        grouped[emoji]["count"] += 1

        grouped[emoji]["users"].append({
            "id": reaction.user.id,
            "username": reaction.user.username,
        })

    return sorted(
        grouped.values(),
        key=lambda item: (-item["count"], item["emoji"])
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def react_message(request, message_id):

    emoji = request.data.get("emoji")

    if not emoji:
        return Response(
            {"detail": "Emoji is required."},
            status=400,
        )

    message = get_object_or_404(
        Message,
        id=message_id,
    )

    user = request.user

    removed = False
    changed = False
    previous_emoji = None

    with transaction.atomic():

        reaction = (
            MessageReaction.objects
            .select_for_update()
            .filter(
                message=message,
                user=user,
            )
            .first()
        )

        # ==========================================
        # NO EXISTING REACTION
        # ==========================================
        if reaction is None:

            MessageReaction.objects.create(
                message=message,
                user=user,
                emoji=emoji,
            )

        # ==========================================
        # SAME EMOJI → REMOVE REACTION
        # ==========================================
        elif reaction.emoji == emoji:

            previous_emoji = reaction.emoji

            reaction.delete()

            removed = True

        # ==========================================
        # DIFFERENT EMOJI → CHANGE REACTION
        # ==========================================
        else:

            previous_emoji = reaction.emoji

            reaction.emoji = emoji

            reaction.save(
                update_fields=["emoji"]
            )

            changed = True

    # ==========================================
    # GET FINAL REACTION SUMMARY
    # ==========================================

    reaction_summary = get_message_reaction_summary(
        message
    )

    print(
        "REACTION RESPONSE:",
        {
            "message_id": message.id,
            "user_id": user.id,
            "emoji": None if removed else emoji,
            "previous_emoji": previous_emoji,
            "removed": removed,
            "changed": changed,
            "reactions": reaction_summary,
        }
    )

    return Response({
        "message_id": message.id,
        "user_id": user.id,

        "emoji": None if removed else emoji,

        "previous_emoji": previous_emoji,

        "removed": removed,
        "changed": changed,

        "reactions": reaction_summary,
    })