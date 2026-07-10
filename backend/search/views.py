from datetime import timedelta

from django.db.models import Count, Q
from django.utils.timezone import now

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import NotFound

from .models import SearchQuery
from users.models import BlockedUser, User
from communities.models import Community, Tribe
from post.models import Post, Repost

from .serializers import (
    UserSearchSerializer,
    PostSearchSerializer,
    TribeSearchSerializer,
    CommunitySearchSerializer,
    RepostSearchSerializer,
)

def get_block_filters(user):
    muted_ids = user.muted_users.values_list(
        "muted_user_id",
        flat=True
    )

    blocked_ids = user.blocked_users.values_list(
        "blocked_user_id",
        flat=True
    )

    blocked_me_ids = BlockedUser.objects.filter(
        blocked_user=user
    ).values_list(
        "user_id",
        flat=True
    )

    return muted_ids, blocked_ids, blocked_me_ids

class SearchPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class GlobalSearchView(APIView):

    pagination_class = SearchPagination

    def get(self, request):
        user = request.user

        muted_ids, blocked_ids, blocked_me_ids = get_block_filters(user)

        q = request.GET.get("q", "").strip()
        search_type = request.GET.get("type", "all")

        if not q:
            return Response({
                "users": [],
                "communities": [],
                "tribes": [],
                "posts": [],
            })

        # SAVE SEARCH
        if request.user.is_authenticated:
            SearchQuery.objects.create(
                query=q,
                user=request.user
            )

        # =========================================
        # USERS
        # =========================================
        if search_type == "users":

            users_qs = (
                User.objects
                .filter(username__icontains=q)
                .exclude(id__in=muted_ids)
                .exclude(id__in=blocked_ids)
                .exclude(id__in=blocked_me_ids)
                .order_by("-date_joined")
            )

            paginator = self.pagination_class()

            try:
                result = paginator.paginate_queryset(
                    users_qs,
                    request,
                    view=self
                )
            except NotFound:
                return Response({
                    "results": [],
                    "next": None,
                    "previous": None,
                })

            serializer = UserSearchSerializer(
                result,
                many=True
            )

            return paginator.get_paginated_response(
                serializer.data
            )

        # =========================================
        # COMMUNITIES
        # =========================================
        if search_type == "communities":

            communities_qs = (
                Community.objects
                .select_related("owner", "tribe")
                .filter(name__icontains=q)
                .order_by("-created_at")
            )

            paginator = self.pagination_class()

            try:
                result = paginator.paginate_queryset(
                    communities_qs,
                    request,
                    view=self
                )
            except NotFound:
                return Response({
                    "results": [],
                    "next": None,
                    "previous": None,
                })

            serializer = CommunitySearchSerializer(
                result,
                many=True
            )

            return paginator.get_paginated_response(
                serializer.data
            )

        # =========================================
        # TRIBES
        # =========================================
        if search_type == "tribes":

            tribes_qs = (
                Tribe.objects
                .filter(name__icontains=q)
                .order_by("-created_at")
            )

            paginator = self.pagination_class()

            try:
                result = paginator.paginate_queryset(
                    tribes_qs,
                    request,
                    view=self
                )
            except NotFound:
                return Response({
                    "results": [],
                    "next": None,
                    "previous": None,
                })

            serializer = TribeSearchSerializer(
                result,
                many=True
            )

            return paginator.get_paginated_response(
                serializer.data
            )

        # =========================================
        # POSTS + REPOSTS
        # =========================================
        if search_type == "posts":

            posts_qs = (
                Post.objects
                .filter(
                    caption__icontains=q,
                    is_approved=True,
                    is_deleted=False
                )
                .exclude(user_id__in=muted_ids)
                .exclude(user_id__in=blocked_ids)
                .exclude(user_id__in=blocked_me_ids)
                .select_related(
                    "user",
                    "community"
                )
                .prefetch_related(
                    "media_files"
                )
                .order_by("-created_at")
            )

            reposts_qs = (
                Repost.objects
                .filter(
                    post__caption__icontains=q,
                    is_deleted=False
                )
                .exclude(post__user_id__in=muted_ids)
                .exclude(post__user_id__in=blocked_ids)
                .exclude(post__user_id__in=blocked_me_ids)
                .select_related(
                    "user",
                    "post",
                    "post__user",
                    "post__community"
                )
                .prefetch_related(
                    "post__media_files"
                )
                .order_by("-created_at")
            )

            posts_data = PostSearchSerializer(
                posts_qs,
                many=True
            ).data

            reposts_data = RepostSearchSerializer(
                reposts_qs,
                many=True
            ).data

            # MARK TYPES
            for p in posts_data:
                p["feed_type"] = "post"

            for r in reposts_data:
                r["feed_type"] = "repost"

            # MERGE
            combined_posts = (
                list(posts_data)
                +
                list(reposts_data)
            )

            # SORT
            combined_posts.sort(
                key=lambda x: x.get("created_at", ""),
                reverse=True
            )

            paginator = self.pagination_class()

            try:
                paginated = paginator.paginate_queryset(
                    combined_posts,
                    request,
                    view=self
                )
            except NotFound:
                return Response({
                    "results": [],
                    "next": None,
                    "previous": None,
                })

            return paginator.get_paginated_response(
                paginated
            )

        # =========================================
        # DEFAULT "ALL"
        # =========================================

        users = UserSearchSerializer(
            User.objects.filter(
                username__icontains=q
            ).exclude(
                id__in=muted_ids
            ).exclude(
                id__in=blocked_ids
            ).exclude(
                id__in=blocked_me_ids
            )[:5],
            many=True
        ).data

        communities = CommunitySearchSerializer(
            Community.objects
            .select_related("owner", "tribe")
            .filter(name__icontains=q)[:5],
            many=True
        ).data

        tribes = TribeSearchSerializer(
            Tribe.objects.filter(
                name__icontains=q
            )[:5],
            many=True
        ).data

        posts_qs = (
            Post.objects
            .filter(
                caption__icontains=q,
                is_approved=True,
                is_deleted=False
            )
            .exclude(user_id__in=muted_ids)
            .exclude(user_id__in=blocked_ids)
            .exclude(user_id__in=blocked_me_ids)
            .select_related(
                "user",
                "community"
            )
            .prefetch_related(
                "media_files"
            )
            .order_by("-created_at")[:5]
        )

        reposts_qs = (
            Repost.objects
            .filter(
                post__caption__icontains=q,
                is_deleted=False
            )
            .exclude(post__user_id__in=muted_ids)
            .exclude(post__user_id__in=blocked_ids)
            .exclude(post__user_id__in=blocked_me_ids)
            .select_related(
                "user",
                "post",
                "post__user",
                "post__community"
            )
            .prefetch_related(
                "post__media_files"
            )
            .order_by("-created_at")[:5]
        )

        posts = PostSearchSerializer(
            posts_qs,
            many=True
        ).data

        reposts = RepostSearchSerializer(
            reposts_qs,
            many=True
        ).data

        # MARK TYPES
        for p in posts:
            p["feed_type"] = "post"

        for r in reposts:
            r["feed_type"] = "repost"

        # MERGE
        combined_posts = posts + reposts

        # SORT
        combined_posts.sort(
            key=lambda x: x.get("created_at", ""),
            reverse=True
        )

        return Response({
            "users": users,
            "communities": communities,
            "tribes": tribes,
            "posts": combined_posts[:5],
        })


@api_view(["GET"])
def trending_search(request):

    current_time = now()

    last_1h = current_time - timedelta(hours=1)
    last_6h = current_time - timedelta(hours=6)
    last_24h = current_time - timedelta(hours=24)
    yesterday_24h = current_time - timedelta(hours=48)

    MIN_SEARCH_COUNT = 5
    MIN_UNIQUE_USERS = 3
    MIN_TREND_SCORE = 20

    trending = (
        SearchQuery.objects
        .exclude(query__isnull=True)
        .exclude(query__exact="")
        .values("query")
        .annotate(

            searches_last_1h=Count(
                "id",
                filter=Q(created_at__gte=last_1h)
            ),

            searches_last_6h=Count(
                "id",
                filter=Q(created_at__gte=last_6h)
            ),

            searches_last_24h=Count(
                "id",
                filter=Q(created_at__gte=last_24h)
            ),

            yesterday_count=Count(
                "id",
                filter=Q(
                    created_at__gte=yesterday_24h,
                    created_at__lt=last_24h
                )
            ),

            unique_users=Count(
                "user",
                distinct=True,
                filter=Q(created_at__gte=last_24h)
            ),
        )
    )

    results = []

    for item in trending:

        trend_score = (
            (item["searches_last_1h"] * 3)
            +
            (item["searches_last_6h"] * 2)
            +
            item["searches_last_24h"]
        )

        yesterday = item["yesterday_count"] or 1

        growth_rate = (
            item["searches_last_24h"] / yesterday
        )

        if (
            item["searches_last_24h"] < MIN_SEARCH_COUNT
            or item["unique_users"] < MIN_UNIQUE_USERS
            or trend_score < MIN_TREND_SCORE
        ):
            continue

        results.append({
            "query": item["query"],
            "count": item["searches_last_24h"],
            "trend_score": trend_score,
            "growth_rate": round(growth_rate, 2),
            "unique_users": item["unique_users"],
        })

    results.sort(
        key=lambda x: (
            x["trend_score"],
            x["growth_rate"]
        ),
        reverse=True
    )

    return Response(results[:10])


@api_view(["GET"])
def search_suggestions(request):

    q = request.GET.get("q", "").strip()

    if not q:
        return Response([])

    suggestions = (
        SearchQuery.objects
        .filter(query__icontains=q)
        .values("query")
        .annotate(count=Count("query"))
        .order_by("-count")[:5]
    )

    return Response([
        {
            "query": s["query"]
        }
        for s in suggestions
    ])