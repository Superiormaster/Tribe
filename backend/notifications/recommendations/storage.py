from .models import UserRecommendation


def save_people_recommendation(
    *,
    user,
    recommended_user,
    score,
    reason,
):

    recommendation = (
        UserRecommendation.objects
        .filter(
            user=user,
            recommendation_type="people",
            recommended_user=recommended_user,
        )
        .first()
    )

    if recommendation:

        recommendation.score = score
        recommendation.reason = reason
        recommendation.dismissed = False

        recommendation.save(
            update_fields=[
                "score",
                "reason",
                "dismissed",
                "updated_at",
            ]
        )

        return recommendation, False

    recommendation = (
        UserRecommendation.objects.create(
            user=user,
            recommendation_type="people",
            recommended_user=recommended_user,
            score=score,
            reason=reason,
        )
    )

    return recommendation, True


def save_post_recommendation(
    *,
    user,
    post,
    score,
    reason,
):

    recommendation = (
        UserRecommendation.objects
        .filter(
            user=user,
            recommendation_type="post",
            post=post,
        )
        .first()
    )

    if recommendation:

        recommendation.score = score
        recommendation.reason = reason
        recommendation.dismissed = False

        recommendation.save(
            update_fields=[
                "score",
                "reason",
                "dismissed",
                "updated_at",
            ]
        )

        return recommendation, False

    recommendation = (
        UserRecommendation.objects.create(
            user=user,
            recommendation_type="post",
            post=post,
            score=score,
            reason=reason,
        )
    )

    return recommendation, True


def save_community_recommendation(
    *,
    user,
    community,
    score,
    reason,
):

    recommendation = (
        UserRecommendation.objects
        .filter(
            user=user,
            recommendation_type="community",
            community=community,
        )
        .first()
    )

    if recommendation:

        recommendation.score = score
        recommendation.reason = reason
        recommendation.dismissed = False

        recommendation.save(
            update_fields=[
                "score",
                "reason",
                "dismissed",
                "updated_at",
            ]
        )

        return recommendation, False

    recommendation = (
        UserRecommendation.objects.create(
            user=user,
            recommendation_type="community",
            community=community,
            score=score,
            reason=reason,
        )
    )

    return recommendation, True