from celery import shared_task

from .models import Post
from ai.topics import extract_topics
import os

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def extract_post_topics_task(self, post_id):

    print(
        "OPENAI KEY PRESENT:",
        bool(os.getenv("OPENAI_API_KEY")),
        flush=True,
    )

    try:
        post = Post.objects.get(
            id=post_id
        )

    except Post.DoesNotExist:
        return {
            "success": False,
            "error": "Post not found.",
        }

    print(
        "=== TOPIC TASK STARTED ===",
        post_id,
        flush=True,
    )

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
                update_fields=[
                    "topics",
                ]
            )

            return {
                "success": True,
                "topics": [],
            }

        topics = extract_topics(text)

        post.topics = topics

        post.save(
            update_fields=[
                "topics",
            ]
        )
  
        print(
            "=== TOPIC TASK COMPLETED ===",
            {
                "post_id": post_id,
                "topics": topics,
            },
            flush=True,
        )

        return {
            "success": True,
            "post_id": post.id,
            "topics": topics,
        }

    except Exception as exc:

        print(
            "=== TOPIC EXTRACTION TASK FAILED ===",
            repr(exc),
            flush=True,
        )

        raise self.retry(
            exc=exc,
            countdown=10,
        )