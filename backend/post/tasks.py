from celery import shared_task
from django.db import transaction

from post.models import Post

from ai.topics import extract_topics
from notifications.recommendations.interests import update_interests


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def extract_post_topics_task(
    self,
    post_id,
):

    try:
        post = (
            Post.objects
            .select_related("user")
            .get(id=post_id)
        )

    except Post.DoesNotExist:
        return

    try:

        text = " ".join(
            filter(
                None,
                [
                    post.caption,
                ],
            )
        )

        if not text.strip():

            post.topics = []

            post.save(
                update_fields=["topics"]
            )

            return

        topics = extract_topics(
            text
        )

        post.topics = topics

        post.save(
            update_fields=["topics"]
        )

        # Author's own interests should also learn
        # from what they publish.
        if topics:

            update_interests(
                user=post.user,
                topics=topics,
                weight=2,
            )

        # Generate/update recommendations
        transaction.on_commit(
            lambda: generate_user_recommendations.delay(
                post.user_id
            )
        )

    except Exception as exc:

        raise self.retry(
            exc=exc,
        )