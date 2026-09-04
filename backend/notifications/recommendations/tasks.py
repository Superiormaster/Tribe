from celery import shared_task


@shared_task
def decay_user_interests():

    from django.db.models import (
        F,
        Value,
    )

    from django.db.models.functions import (
        Greatest,
    )

    from .models import UserInterest

    UserInterest.objects.update(
        score=Greatest(
            F("score") * 0.98,
            Value(0),
        )
    )


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def generate_user_recommendations(
    self,
    user_id,
):

    from django.contrib.auth import (
        get_user_model,
    )

    from .people import (
        generate_people_recommendations,
    )

    from .posts import (
        generate_post_recommendations,
    )

    from .communities import (
        generate_community_recommendations,
    )

    from notifications.services.recommendation_push import (
        create_recommendation_notifications,
    )

    User = get_user_model()

    try:

        user = User.objects.get(
            id=user_id
        )

    except User.DoesNotExist:

        return

    try:

        people = (
            generate_people_recommendations(
                user=user,
                limit=20,
            )
        )

        posts = (
            generate_post_recommendations(
                user=user,
                limit=20,
            )
        )

        communities = (
            generate_community_recommendations(
                user=user,
                limit=20,
            )
        )

        create_recommendation_notifications(
            user=user,
            people=people,
            posts=posts,
            communities=communities,
        )

        return {
            "success": True,

            "user_id":
                user_id,

            "people":
                len(people),

            "posts":
                len(posts),

            "communities":
                len(communities),
        }

    except Exception as exc:

        raise self.retry(
            exc=exc,
        )