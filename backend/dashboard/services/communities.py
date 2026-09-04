from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from communities.models import (
    Community,
    CommunityMembership,
)

from post.models import (
    Post,
    Like,
    Comment,
    Repost,
    Share,
    Bookmark,
)


class AnalyticsCommunityService:

    def __init__(self, user, params):
        self.user = user
        self.params = params

        self.range = params.get("range", "7D").upper()

        self.end_date = timezone.now()
        self.start_date = self.get_start_date()

    # --------------------------------------------------
    # DATE RANGE
    # --------------------------------------------------

    def get_start_date(self):

        if self.range == "7D":
            return self.end_date - timedelta(days=7)

        if self.range == "28D":
            return self.end_date - timedelta(days=28)

        if self.range == "3M":
            return self.end_date - timedelta(days=90)

        if self.range == "1Y":
            return self.end_date - timedelta(days=365)

        return self.end_date - timedelta(days=7)

    # --------------------------------------------------
    # MAIN
    # --------------------------------------------------

    def get_communities(self):

        communities = (
            Community.objects
            .filter(owner=self.user)
            .order_by("-created_at")
        )

        results = []

        for community in communities:

            members = CommunityMembership.objects.filter(
                community=community
            )

            member_count = members.count()

            # ------------------------------------------
            # ACTIVE MEMBERS
            # ------------------------------------------
            #
            # A member is considered active if they
            # performed activity in this period.
            #
            # We check:
            # - posts
            # - likes
            # - comments
            # - reposts
            # - shares
            # - bookmarks
            #
            active_user_ids = set()

            posts = Post.objects.filter(
                community=community,
                is_deleted=False,
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
            )

            active_user_ids.update(
                posts.values_list("user_id", flat=True)
            )

            active_user_ids.update(
                Like.objects.filter(
                    post__community=community,
                    post__is_deleted=False,
                    created_at__gte=self.start_date,
                    created_at__lte=self.end_date,
                ).values_list("user_id", flat=True)
            )

            active_user_ids.update(
                Comment.objects.filter(
                    post__community=community,
                    post__is_deleted=False,
                    is_deleted=False,
                    created_at__gte=self.start_date,
                    created_at__lte=self.end_date,
                ).values_list("user_id", flat=True)
            )

            active_user_ids.update(
                Repost.objects.filter(
                    community=community,
                    is_deleted=False,
                    created_at__gte=self.start_date,
                    created_at__lte=self.end_date,
                ).values_list("user_id", flat=True)
            )

            active_user_ids.update(
                Share.objects.filter(
                    community=community,
                    is_deleted=False,
                    status="approved",
                    created_at__gte=self.start_date,
                    created_at__lte=self.end_date,
                ).values_list("user_id", flat=True)
            )

            active_user_ids.update(
                Bookmark.objects.filter(
                    post__community=community,
                    post__is_deleted=False,
                    created_at__gte=self.start_date,
                    created_at__lte=self.end_date,
                ).values_list("user_id", flat=True)
            )

            active_members = len(active_user_ids)

            # ------------------------------------------
            # POSTS
            # ------------------------------------------

            post_count = posts.count()

            # ------------------------------------------
            # ENGAGEMENT
            # ------------------------------------------

            likes = Like.objects.filter(
                post__community=community,
                post__is_deleted=False,
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
            ).count()

            comments = Comment.objects.filter(
                post__community=community,
                post__is_deleted=False,
                is_deleted=False,
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
            ).count()

            reposts = Repost.objects.filter(
                community=community,
                is_deleted=False,
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
            ).count()

            shares = Share.objects.filter(
                community=community,
                is_deleted=False,
                status="approved",
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
            ).count()

            bookmarks = Bookmark.objects.filter(
                post__community=community,
                post__is_deleted=False,
                created_at__gte=self.start_date,
                created_at__lte=self.end_date,
            ).count()

            engagement_count = (
                likes
                + comments
                + reposts
                + shares
                + bookmarks
            )
  
            if member_count > 0:
                engagement = round(
                    (engagement_count / member_count) * 100,
                    1,
                )
            else:
                engagement = 0.0

            results.append({
                "id": str(community.id),
                "name": community.name,
                "cover": (
                    community.cover_image_asset.original_url
                    if community.cover_image_asset
                    else community.cover_image
                ),
                "members": member_count,
                "activeMembers": active_members,
                "posts": post_count,
                "engagement": engagement,
                "engagementCount": engagement_count,
            })

        return results