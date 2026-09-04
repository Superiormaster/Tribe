from collections import defaultdict
from django.contrib.auth import get_user_model
from communities.models import (
    CommunityMembership,
)
from users.models import (
    ConnectionRequest,
)
from post.models import (
    Like,
    Comment,
    Bookmark,
    Share,
)
from .models import (
    UserRecommendation,
    UserInterest,
)
from .storage import save_post_recommendation

from .interests import (
    get_interest_map,
)

User = get_user_model()

def get_accepted_connections(user):

    sent = set(
        ConnectionRequest.objects
        .filter(
            from_user=user,
            status="accepted",
        )
        .values_list(
            "to_user_id",
            flat=True,
        )
    )

    received = set(
        ConnectionRequest.objects
        .filter(
            to_user=user,
            status="accepted",
        )
        .values_list(
            "from_user_id",
            flat=True,
        )
    )

    return sent | received

def get_candidate_users(user):

    connections = get_accepted_connections(
        user
    )

    candidates = set()

    # -------------------------
    # Same communities
    # -------------------------

    community_ids = set(
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

    if community_ids:

        users = (
            CommunityMembership.objects
            .filter(
                community_id__in=community_ids,
                banned=False,
            )
            .exclude(
                user=user,
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )

        candidates.update(users)

    # -------------------------
    # Similar interests
    # -------------------------

    interests = get_interest_map(user)

    if interests:

        users = (
            UserInterest.objects
            .filter(
                topic__in=interests.keys(),
                score__gt=0,
            )
            .exclude(
                user=user,
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )

        candidates.update(users)

    # -------------------------
    # Mutual connections
    # -------------------------

    for candidate_id in get_mutual_connection_candidates(
        user
    ):
        candidates.add(candidate_id)

    # -------------------------
    # Similar post activity
    # -------------------------

    for candidate_id in get_similar_post_activity_candidates(
        user
    ):
        candidates.add(candidate_id)

    # -------------------------
    # Remove yourself
    # -------------------------

    candidates.discard(user.id)

    # -------------------------
    # Remove existing connections
    # -------------------------

    candidates.difference_update(
        connections
    )

    return candidates

def get_mutual_connection_candidates(user):

    my_connections = get_accepted_connections(
        user
    )

    if not my_connections:
        return set()

    candidates = set()

    for connection_id in my_connections:

        connection = User.objects.filter(
            id=connection_id
        ).first()

        if not connection:
            continue

        their_connections = (
            get_accepted_connections(
                connection
            )
        )

        candidates.update(
            their_connections
        )

    candidates.discard(user.id)

    candidates.difference_update(
        my_connections
    )

    return candidates

def get_similar_post_activity_candidates(
    user,
):

    my_posts = get_user_interacted_post_ids(
        user
    )

    if not my_posts:
        return set()

    candidates = set()

    candidate_ids = (
        Like.objects
        .filter(
            post_id__in=my_posts
        )
        .exclude(
            user=user
        )
        .values_list(
            "user_id",
            flat=True,
        )
    )

    candidates.update(candidate_ids)

    candidate_ids = (
        Comment.objects
        .filter(
            post_id__in=my_posts,
            is_deleted=False,
        )
        .exclude(
            user=user
        )
        .values_list(
            "user_id",
            flat=True,
        )
    )

    candidates.update(candidate_ids)

    return candidates

def score_shared_communities(
    user,
    candidate,
):

    user_communities = set(
        CommunityMembership.objects
        .filter(
            user=user,
        )
        .values_list(
            "community_id",
            flat=True,
        )
    )

    candidate_communities = set(
        CommunityMembership.objects
        .filter(
            user=candidate,
        )
        .values_list(
            "community_id",
            flat=True,
        )
    )

    shared = (
        user_communities
        & candidate_communities
    )

    return min(
        len(shared) * 10,
        30,
    )

def score_similar_interests(
    user,
    candidate,
):

    user_interests = get_interest_map(
        user
    )

    candidate_interests = get_interest_map(
        candidate
    )

    score = 0

    for topic, user_score in user_interests.items():

        candidate_score = (
            candidate_interests.get(
                topic,
                0,
            )
        )

        if candidate_score <= 0:
            continue

        score += min(
            user_score,
            candidate_score,
        ) * 0.2

    return min(
        score,
        30,
    )

def score_mutual_connections(
    user,
    candidate,
):

    my_connections = (
        get_accepted_connections(user)
    )

    their_connections = (
        get_accepted_connections(candidate)
    )

    mutuals = (
        my_connections
        & their_connections
    )

    return min(
        len(mutuals) * 20,
        40,
    )

def score_similar_post_activity(
    user,
    candidate,
):

    my_posts = (
        get_user_interacted_post_ids(
            user
        )
    )

    candidate_posts = (
        get_user_interacted_post_ids(
            candidate
        )
    )

    shared_posts = (
        my_posts
        & candidate_posts
    )

    return min(
        len(shared_posts) * 8,
        25,
    )

def get_user_interacted_post_ids(user):

    post_ids = set()

    post_ids.update(
        Like.objects
        .filter(user=user)
        .values_list(
            "post_id",
            flat=True,
        )
    )

    post_ids.update(
        Comment.objects
        .filter(
            user=user,
            is_deleted=False,
        )
        .values_list(
            "post_id",
            flat=True,
        )
    )

    post_ids.update(
        Bookmark.objects
        .filter(user=user)
        .values_list(
            "post_id",
            flat=True,
        )
    )

    post_ids.update(
        Share.objects
        .filter(user=user)
        .values_list(
            "post_id",
            flat=True,
        )
    )

    return post_ids

def get_recommendation_reason(
    user,
    candidate,
):

    mutual_score = (
        score_mutual_connections(
            user,
            candidate,
        )
    )

    community_score = (
        score_shared_communities(
            user,
            candidate,
        )
    )

    interest_score = (
        score_similar_interests(
            user,
            candidate,
        )
    )

    activity_score = (
        score_similar_post_activity(
            user,
            candidate,
        )
    )

    reasons = []

    if mutual_score:
        reasons.append(
            "You have mutual connections"
        )

    if community_score:
        reasons.append(
            "You are in the same communities"
        )

    if interest_score:
        reasons.append(
            "You have similar interests"
        )

    if activity_score:
        reasons.append(
            "You interact with similar posts"
        )

    return (
        reasons[0]
        if reasons
        else "You might know this person"
    )

def calculate_people_score(
    user,
    candidate,
):

    community_score = (
        score_shared_communities(
            user,
            candidate,
        )
    )

    interest_score = (
        score_similar_interests(
            user,
            candidate,
        )
    )

    mutual_score = (
        score_mutual_connections(
            user,
            candidate,
        )
    )

    activity_score = (
        score_similar_post_activity(
            user,
            candidate,
        )
    )

    return (
        community_score
        + interest_score
        + mutual_score
        + activity_score
    )

def generate_people_recommendations(
    user,
    limit=20,
):

    remove_invalid_recommendations(user)

    candidates = get_candidate_users(
        user
    )

    scored = []

    for candidate_id in candidates:

        candidate = (
            User.objects
            .filter(
                id=candidate_id,
                is_active=True,
            )
            .first()
        )

        if not candidate:
            continue

        score = calculate_people_score(
            user,
            candidate,
        )

        if score <= 0:
            continue

        reason = get_recommendation_reason(
            user,
            candidate,
        )

        scored.append(
            {
                "user": candidate,
                "score": score,
                "reason": reason,
            }
        )

    scored.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    scored = scored[:limit]

    results = []

    for item in scored:
    
        recommendation, created = save_people_recommendation(
            user=user,
            recommended_user=candidate,
            score=score,
            reason=reason,
        )
    
        results.append(
            {
                "recommendation":
                    recommendation,
    
                "user":
                    item["user"],
    
                "score":
                    item["score"],
    
                "reason":
                    item["reason"],
    
                "created":
                    created,
            }
        )
    
    return results

def remove_invalid_recommendations(user):

    connections = get_accepted_connections(
        user
    )

    UserRecommendation.objects.filter(
        user=user,
        recommended_user_id__in=connections,
    ).delete()

    UserRecommendation.objects.filter(
        user=user,
        recommended_user=user,
    ).delete()