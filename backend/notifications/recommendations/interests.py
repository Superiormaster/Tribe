from django.db import transaction

from .models import UserInterest


def normalize_topic(topic):
    return topic.strip().lower()[:100]


@transaction.atomic
def update_interests(
    user,
    topics,
    weight,
):
    for topic in topics:
        topic = normalize_topic(topic)

        if not topic:
            continue

        interest, _ = (
            UserInterest.objects
            .select_for_update()
            .get_or_create(
                user=user,
                topic=topic,
                defaults={
                    "score": 0,
                },
            )
        )

        interest.score = min(
            max(
                interest.score + weight,
                0,
            ),
            1000,
        )

        interest.save(
            update_fields=[
                "score",
                "updated_at",
            ]
        )


def get_interest_map(user):
    return {
        interest.topic.lower(): interest.score
        for interest in (
            UserInterest.objects
            .filter(user=user)
            .only("topic", "score")
        )
    }