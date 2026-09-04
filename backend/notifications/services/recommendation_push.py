from users.utils import (
    get_user_avatar,
)


def get_notification_link(
    notification,
    actor=None,
):

    if notification.type == "recommendation":

        if (
            notification.recommendation_type
            == "people"
        ):

            if actor:

                return (
                    f"/main/profile/"
                    f"{actor.username}"
                )

        elif (
            notification.recommendation_type
            == "post"
        ):

            if notification.post:

                return (
                    f"/main/home/"
                    f"{notification.post.id}"
                )

        elif (
            notification.recommendation_type
            == "community"
        ):

            if notification.community:

                return (
                    f"/main/community/"
                    f"{notification.community.id}"
                )

        return "/main/notifications"

    # --------------------------------
    # Normal notifications
    # --------------------------------

    if notification.post:

        return (
            f"/main/home/"
            f"{notification.post.id}"
        )

    if notification.community:

        return (
            f"/main/community/"
            f"{notification.community.id}"
        )

    return "/main/notifications"


def get_community_cover(community):

    if not community:
        return ""

    asset = getattr(
        community,
        "cover_image_asset",
        None,
    )

    if asset:

        return (
            asset.original_url
            or ""
        )

    return (
        getattr(
            community,
            "cover_image",
            "",
        )
        or ""
    )


def get_post_thumbnail(post):

    if not post:
        return ""

    media = (
        post.media_files
        .filter(
            media_type__in=[
                "video",
                "image",
            ]
        )
        .first()
    )

    if not media:
        return ""

    asset = getattr(
        media,
        "asset",
        None,
    )

    if asset:

        return (
            asset.thumbnail_url
            or asset.original_url
            or ""
        )

    return (
        getattr(
            media,
            "thumbnail",
            "",
        )
        or getattr(
            media,
            "file",
            "",
        )
        or ""
    )


def build_recommendation_payload(
    notification,
    actor=None,
):

    payload = {

        "id": str(
            notification.id
        ),

        "type": "recommendation",

        "recommendationType": (
            notification.recommendation_type
            or ""
        ),

        "title": "Recommended for you",

        "body": (
            notification.message
            or ""
        ),

        # --------------------------------
        # LEFT IMAGE / PEOPLE
        # --------------------------------

        "avatar": "",

        "userId": "",

        "username": "",

        # --------------------------------
        # POST
        # --------------------------------

        "postId": "",

        "thumbnail": "",

        # --------------------------------
        # COMMUNITY
        # --------------------------------

        "communityId": "",

        "communityName": "",

        "communityCover": "",

        # --------------------------------
        # LINK
        # --------------------------------

        "link": get_notification_link(
            notification,
            actor=actor,
        ),
        "createdAt": notification.created_at.isoformat(),
    }

    # ==================================
    # PEOPLE
    # ==================================

    if (
        notification.recommendation_type
        == "people"
    ):

        if actor:

            payload["userId"] = str(
                actor.id
            )

            payload["username"] = (
                actor.username or ""
            )

            payload["avatar"] = (
                get_user_avatar(actor)
                or ""
            )

            payload["title"] = (
                "People you may know"
            )

            payload["link"] = (
                f"/main/profile/"
                f"{actor.username}"
            )

    # ==================================
    # POST
    # ==================================

    elif (
        notification.recommendation_type
        == "post"
    ):

        post = notification.post

        if post:

            payload["postId"] = str(
                post.id
            )

            payload["thumbnail"] = (
                get_post_thumbnail(post)
            )

            # Author avatar
            if post.user:

                payload["avatar"] = (
                    get_user_avatar(
                        post.user
                    )
                    or ""
                )

            payload["title"] = (
                "Recommended post"
            )

            payload["link"] = (
                f"/main/home/"
                f"{post.id}"
            )

    # ==================================
    # COMMUNITY
    # ==================================

    elif (
        notification.recommendation_type
        == "community"
    ):

        community = (
            notification.community
        )

        if community:

            cover = (
                get_community_cover(
                    community
                )
            )

            payload["communityId"] = str(
                community.id
            )

            payload["communityName"] = (
                community.name or ""
            )

            payload["communityCover"] = (
                cover
            )

            # Left-side image
            payload["avatar"] = cover

            payload["thumbnail"] = cover

            payload["title"] = (
                "Community recommendation"
            )

            payload["link"] = (
                f"/main/community/"
                f"{community.id}"
            )

    return payload