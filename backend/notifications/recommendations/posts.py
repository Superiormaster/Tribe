from django.db.models import Q

from post.models import Post
from .storage import save_post_recommendation


def score_post(
    user,
    post,
    interests,
):

    score = 0

    topics = post.topics or []

    # -------------------------
    # Topic match
    # -------------------------

    for topic in topics:

        topic_score = interests.get(
            topic.lower(),
            0,
        )

        score += topic_score * 2

    # -------------------------
    # Engagement
    # -------------------------

    likes = getattr(
        post,
        "likes_count",
        0,
    ) or 0

    comments = getattr(
        post,
        "comments_count",
        0,
    ) or 0

    shares = getattr(
        post,
        "shares_count",
        0,
    ) or 0

    score += min(likes, 100) * 0.2
    score += min(comments, 50) * 0.5
    score += min(shares, 50) * 0.8

    return score


def get_recommended_posts(
    user,
    limit=20,
):

    from .interests import get_interest_map

    interests = get_interest_map(
        user
    )

    queryset = (
        Post.objects
        .filter(
            is_deleted=False,
            is_approved=True,
        )
        .exclude(
            user=user,
        )
        .order_by("-created_at")
    )

    scored = []

    for post in queryset[:300]:

        score = score_post(
            user,
            post,
            interests,
        )

        scored.append(
            (
                post,
                score,
            )
        )

    scored.sort(
        key=lambda item: item[1],
        reverse=True,
    )

    return [
        post
        for post, score
        in scored[:limit]
    ]

def generate_post_recommendations(
    user,
    limit=20,
):

    from .models import (
        UserRecommendation,
    )

    from .posts import (
        get_recommended_posts,
        score_post,
    )

    from .interests import (
        get_interest_map,
    )

    interests = get_interest_map(user)

    posts = get_recommended_posts(
        user=user,
        limit=limit,
    )

    results = []

    for post in posts:

        score = score_post(
            user,
            post,
            interests,
        )

        reason = (
            "Based on your interests"
        )

        recommendation, created = (
            save_post_recommendation(
                user=user,
                post=post,
                score=score,
                reason=reason,
            )
        )

        results.append(
            {
                "recommendation":
                    recommendation,

                "post":
                    post,

                "score":
                    score,

                "reason":
                    reason,

                "created":
                    created,
            }
        )

    return results