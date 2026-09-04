from notifications.createNotification import (
    create_notification,
)


def create_recommendation_notifications(
    *,
    user,
    people,
    posts,
    communities,
):

    # ==================================
    # PEOPLE
    # ==================================

    for item in people:

        if not item["created"]:
            continue

        create_notification(
            type="recommendation",
            recipient=user,
            actors=[
                item["user"]
            ],
            recommendation_type="people",
            message=(
                item["reason"]
                or "You might know this person"
            ),
            push=True,
        )

    # ==================================
    # POSTS
    # ==================================

    for item in posts:

        if not item["created"]:
            continue

        create_notification(
            type="recommendation",
            recipient=user,
            post=item["post"],
            recommendation_type="post",
            message=(
                item["reason"]
                or "Based on your interests"
            ),
            push=True,
        )

    # ==================================
    # COMMUNITIES
    # ==================================

    for item in communities:

        if not item["created"]:
            continue

        create_notification(
            type="recommendation",
            recipient=user,
            community=item["community"],
            recommendation_type="community",
            message=(
                item["reason"]
                or (
                    "A community you might "
                    "be interested in"
                )
            ),
            push=True,
        )