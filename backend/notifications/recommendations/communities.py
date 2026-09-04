from communities.models import (
    Community,
    CommunityMembership,
)
from .storage import save_post_recommendation

from .interests import get_interest_map


def score_community(
    user,
    community,
):

    interests = get_interest_map(
        user
    )

    score = 0

    # Community posts
    posts = (
        community.posts
        .filter(
            is_deleted=False,
            is_approved=True,
        )
        .exclude(
            topics=[],
        )
        .values_list(
            "topics",
            flat=True,
        )[:50]
    )

    for topics in posts:

        for topic in topics or []:

            score += (
                interests.get(
                    topic.lower(),
                    0,
                ) * 0.5
            )

    return score


def get_recommended_communities(
    user,
    limit=20,
):

    joined_ids = (
        CommunityMembership.objects
        .filter(
            user=user,
            banned=False,
        )
        .values_list(
            "community_id",
            flat=True,
        )
    )

    communities = (
        Community.objects
        .exclude(
            id__in=joined_ids
        )
    )

    results = []

    for community in communities:

        score = score_community(
            user,
            community,
        )

        if score > 0:

            results.append(
                (
                    community,
                    score,
                )
            )

    results.sort(
        key=lambda x: x[1],
        reverse=True,
    )

    return [
        community
        for community, score
        in results[:limit]
    ]

def generate_community_recommendations(
    user,
    limit=20,
):

    from .models import (
        UserRecommendation,
    )

    from .communities import (
        get_recommended_communities,
        score_community,
    )

    communities = (
        get_recommended_communities(
            user=user,
            limit=limit,
        )
    )

    results = []

    for community in communities:

        score = score_community(
            user,
            community,
        )

        reason = (
            "Based on your interests"
        )

        recommendation, created = (
            save_community_recommendation(
                user=user,
                community=community,
                score=score,
                reason=reason,
            )
        )

        results.append(
            {
                "recommendation":
                    recommendation,

                "community":
                    community,

                "score":
                    score,

                "reason":
                    reason,

                "created":
                    created,
            }
        )

    return results