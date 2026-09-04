# feed/services.py

import hashlib
from django.db.models import *
from django.utils import timezone
from datetime import timedelta
from .models import Post, Repost, Share, Like
from users.models import BlockedUser
from .weights import get_user_weights
from .cache import *
from django.db.models.functions import Least, Cast
import random
from users.utils import redis_client
from notifications.recommendations.interests import get_interest_map
from django.db.models import Avg, Count, Sum, Case, When, Value, FloatField, ExpressionWrapper, IntegerField, F, Q, Exists, OuterRef
from users.models import BlockedUser, Star
from django.db.models.functions import Coalesce, Least, NullIf

# -----------------------------
# BASE QUERYSET
# -----------------------------
def build_base_queryset(user):

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

    return Post.objects.filter(
        is_deleted=False,
        is_approved=True,
        is_rejected=False
    ).exclude(
        user_id__in=muted_ids
    ).exclude(
        user_id__in=blocked_ids
    ).exclude(
        user_id__in=blocked_me_ids
    ).select_related(
        "user",
        "community"
    ).prefetch_related(
      "media_files__asset"
    ).annotate(
        likes_count=Count("likes", distinct=True),
        comments_count=Count(
            "comments",
            filter=Q(comments__is_deleted=False),
            distinct=True,
        ),
        shares_count=Count(
            "shares",
            filter=Q(
                shares__is_deleted=False,
                shares__status="approved",
            ),
            distinct=True,
        ),
        repost_count=Count(
            "reposts",
            filter=Q(reposts__is_deleted=False),
            distinct=True
        ),
        is_liked=Exists(
            Like.objects.filter(
                post=OuterRef("pk"),
                user=user
            )
        )
    )

def build_share_queryset(
    user,
    muted_ids,
    blocked_ids,
    blocked_me_ids,
    tribe_id=None,
):
    shares = Share.objects.filter(
        is_deleted=False,
        status="approved",
        post__is_deleted=False,
        post__is_approved=True,
        post__is_rejected=False,
    ).exclude(
        user_id__in=muted_ids
    ).exclude(
        user_id__in=blocked_ids
    ).exclude(
        user_id__in=blocked_me_ids
    ).select_related(
        "user",
        "post",
        "post__user",
        "post__community",
        "community",
    ).prefetch_related(
        "post__media_files__asset",
    ).annotate(
        likes_count=Count(
            "post__likes",
            distinct=True,
        ),
        comments_count=Count(
            "post__comments",
            filter=Q(
                post__comments__is_deleted=False
            ),
            distinct=True,
        ),
        shares_count=Count(
            "post__shares",
            filter=Q(
                post__shares__is_deleted=False,
                post__shares__status="approved",
            ),
            distinct=True,
        ),
        repost_count=Count(
            "post__reposts",
            filter=Q(
                post__reposts__is_deleted=False
            ),
            distinct=True,
        ),
        is_liked=Exists(
            Like.objects.filter(
                post=OuterRef("post_id"),
                user=user,
            )
        ),
        views_count=F("post__views_count"),
        skipped_views=F("post__skipped_views"),
    )

    if tribe_id:
        shares = shares.filter(
            community__isnull=False,
            community__tribe_id=tribe_id,
        )

    return shares

def build_global_feed(
    user,
    joined_communities,
    starred_ids,
    two_weeks_ago,
    tribe_id=None,
):
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

    weights = get_user_weights(user)
    interest_map = get_interest_map(user)
  
    cached = get_cached_feed(
        redis_client,
        user.id,
        tribe_id
    ) or []
    
    post_ids = []
    repost_ids = []
    share_ids = []
    
    print(
        "🔥 FEED BUILD:",
        {
            "user": user.id,
            "tribe_id": tribe_id,
            "cache_length": len(cached),
            "cache_hit": bool(cached),
        },
        flush=True,
    )
    
    # -------------------------
    # READ CACHE IDS
    # -------------------------
    
    for item in cached:
    
        if item["type"] == "post":
            post_ids.append(item["id"])
    
        elif item["type"] == "repost":
            repost_ids.append(item["id"])
    
        elif item["type"] == "share":
            share_ids.append(item["id"])
    
    
    # -------------------------
    # BUILD DATABASE MAPS
    # -------------------------
    
    post_map = {
        p.id: p
        for p in compute_main_feed_score(
            annotate_features(
                build_base_queryset(user).filter(
                    id__in=post_ids
                ),
                user,
                joined_communities,
                starred_ids,
                two_weeks_ago,
            ),
            weights,
        )
    }
  
    share_map = {
        s.id: s
        for s in compute_main_feed_score(
            annotate_share_features(
                Share.objects.filter(
                    id__in=share_ids,
                    is_deleted=False,
                    status="approved",
                    post__is_deleted=False,
                    post__is_approved=True,
                    post__is_rejected=False,
                )
                .select_related(
                    "user",
                    "post",
                    "post__user",
                    "post__community",
                    "community",
                )
                .prefetch_related(
                    "post__media_files__asset",
                )
                .annotate(
                    likes_count=Count(
                        "post__likes",
                        distinct=True,
                    ),
                    comments_count=Count(
                        "post__comments",
                        filter=Q(
                            post__comments__is_deleted=False
                        ),
                        distinct=True,
                    ),
                    shares_count=Count(
                        "post__shares",
                        filter=Q(
                            post__shares__is_deleted=False,
                            post__shares__status="approved",
                        ),
                        distinct=True,
                    ),
                    repost_count=Count(
                        "post__reposts",
                        filter=Q(
                            post__reposts__is_deleted=False
                        ),
                        distinct=True,
                    ),
                    is_liked=Exists(
                        Like.objects.filter(
                            post=OuterRef("post_id"),
                            user=user,
                        )
                    ),
                    views_count=F("post__views_count"),
                    skipped_views=F("post__skipped_views"),
                ),
                user,
                joined_communities,
                starred_ids,
                two_weeks_ago,
            ),
            weights,
        )
    }

    repost_map = {
        r.id: r
        for r in compute_main_feed_score(
            annotate_repost_features(
                Repost.objects.filter(
                    id__in=repost_ids,
                    is_deleted=False,
                    post__is_approved=True,
                    post__is_deleted=False,
                )
                .exclude(
                    post__user_id__in=muted_ids
                )
                .exclude(
                    post__user_id__in=blocked_ids
                )
                .exclude(
                    post__user_id__in=blocked_me_ids
                )
                .select_related(
                    "user",
                    "post",
                    "post__user",
                    "post__community",
                )
                .annotate(
                    likes_count=Count(
                        "post__likes",
                        distinct=True
                    ),
                    comments_count=Count(
                        "post__comments",
                        filter=Q(
                            post__comments__is_deleted=False
                        ),
                        distinct=True
                    ),
                    shares_count=Count(
                        "post__shares",
                        filter=Q(
                            post__shares__is_deleted=False,
                            post__shares__status="approved",
                        ),
                        distinct=True,
                    ),
                    repost_count=Count(
                        "post__reposts",
                        filter=Q(
                            post__reposts__is_deleted=False
                        ),
                        distinct=True
                    ),
                    is_liked=Exists(
                        Like.objects.filter(
                            post=OuterRef("post_id"),
                            user=user
                        )
                    ),
                    views_count=F("post__views_count"),
                    skipped_views=F("post__skipped_views"),
                ),
                user,
                joined_communities,
                starred_ids,
                two_weeks_ago,
            ),
            weights,
        )
    }
  
    # -------------------------
    # REBUILD FEED FROM CACHE
    # -------------------------
    
    if cached:
    
        items = []
    
        for cached_item in cached:
    
            if cached_item["type"] == "post":
    
                obj = post_map.get(cached_item["id"])
    
                if obj:
                    items.append({
                        "type": "post",
                        "data": obj,
                        "score": obj.final_score,
                        "created_at": obj.created_at,
                    })
    
            elif cached_item["type"] == "repost":
    
                obj = repost_map.get(cached_item["id"])
    
                if obj:
                    items.append({
                        "type": "repost",
                        "data": obj,
                        "score": obj.final_score,
                        "created_at": obj.created_at,
                    })
    
            elif cached_item["type"] == "share":
    
                obj = share_map.get(cached_item["id"])
    
                if obj:
                    items.append({
                        "type": "share",
                        "data": obj,
                        "score": obj.final_score,
                        "created_at": obj.created_at,
                    })
    
        # --------------------------------
        # APPLY INTEREST BONUS
        # --------------------------------
    
        for item in items:
    
            if item["type"] == "post":
                topics = item["data"].topics
            else:
                topics = item["data"].post.topics
    
            bonus = sum(
                interest_map.get(
                    str(topic).lower(),
                    0
                )
                for topic in (topics or [])
            )
    
            item["final_score"] = (
                item["data"].final_score +
                bonus
            )
    
        # --------------------------------
        # SORT + FINALIZE
        # --------------------------------
    
        items.sort(
            key=lambda x: x["final_score"],
            reverse=True,
        )
    
        items = finalize_feed(
            items,
            user
        )
    
        print(
            "🔥 CACHED FEED REBUILT:",
            {
                "cached_items": len(cached),
                "rebuilt_items": len(items),
                "post_map": len(post_map),
                "share_map": len(share_map),
                "repost_map": len(repost_map),
            },
            flush=True,
        )
    
        return items

    posts = build_base_queryset(user)

    if tribe_id:
        posts = posts.filter(
            community__isnull=False,
            community__tribe_id=tribe_id,
        )

    posts = annotate_features(
        posts,
        user,
        joined_communities,
        starred_ids,
        two_weeks_ago
    )

    posts = (
      compute_main_feed_score(posts, weights)
      .order_by("-final_score")[:500]
    )

    shares = build_share_queryset(
        user,
        muted_ids,
        blocked_ids,
        blocked_me_ids,
        tribe_id,
    )
  
    shares = annotate_share_features(
        shares,
        user,
        joined_communities,
        starred_ids,
        two_weeks_ago,
    )
  
    shares = (
        compute_main_feed_score(
            shares,
            weights
        )
        .order_by("-final_score")[:500]
    )

    reposts = Repost.objects.filter(
        is_deleted=False,
        post__is_deleted=False,
        post__is_approved=True,
    ).select_related(
        "user",
        "post",
        "post__user",
        "post__community"
    ).annotate(
        likes_count=Count(
            "post__likes",
            distinct=True
        ),
        comments_count=Count(
            "post__comments",
            filter=Q(post__comments__is_deleted=False),
            distinct=True
        ),
        shares_count=Count(
            "post__shares",
            filter=Q(
                post__shares__is_deleted=False,
                post__shares__status="approved",
            ),
            distinct=True,
        ),
        repost_count=Count(
            "post__reposts",
            filter=Q(post__reposts__is_deleted=False),
            distinct=True
        ),
        is_liked=Exists(
            Like.objects.filter(
                post=OuterRef("post_id"),
                user=user
            )
        ),
        views_count=F(
            "post__views_count"
        ),
        skipped_views=F(
            "post__skipped_views"
        ),
    )

    reposts = reposts.exclude(
        post__user_id__in=muted_ids
    ).exclude(
        post__user_id__in=blocked_ids
    ).exclude(
        post__user_id__in=blocked_me_ids
    )

    if tribe_id:
      reposts = reposts.filter(
          post__community__isnull=False,
          post__community__tribe_id=tribe_id,
      )

    reposts = annotate_repost_features(
        reposts,
        user,
        joined_communities,
        starred_ids,
        two_weeks_ago
    )

    reposts = (
      compute_main_feed_score(reposts, weights)
      .order_by("-final_score")[:500]
    )

    items = []
  
    for p in posts:
        items.append({
            "type": "post",
            "data": p,
            "score": p.final_score,
            "created_at": p.created_at,
        })

    for r in reposts:
        items.append({
            "type": "repost",
            "data": r,
            "score": r.final_score,
            "created_at": r.created_at,
        })
  
    for s in shares:
      items.append({
          "type": "share",
          "data": s,
          "score": s.final_score,
          "created_at": s.created_at,
      })

    items = finalize_feed(
        items,
        user
    )

    for item in items:

      if item["type"] == "post":
          topics = item["data"].topics
      else:
          topics = item["data"].post.topics
  
      bonus = 0
  
      for topic in (topics or []):
          bonus += interest_map.get(
              topic.lower(),
              0,
          )
  
      item["final_score"] += bonus

    items.sort(
        key=lambda x: x["final_score"],
        reverse=True,
    )
  
    cache_data = []

    for item in items:
    
        if item["type"] == "post":
            cache_data.append({
                "type": "post",
                "id": item["data"].id,
            })
    
        elif item["type"] == "repost":
            cache_data.append({
                "type": "repost",
                "id": item["data"].id,
            })
    
        elif item["type"] == "share":
            cache_data.append({
                "type": "share",
                "id": item["data"].id,
            })
  
    set_cached_feed(
        redis_client,
        user.id,
        cache_data,
        ttl=300,
        tribe_id=tribe_id,
    )

    print(
        "🔥 NEW FEED BUILT:",
        {
            "posts": len(posts),
            "reposts": len(reposts),
            "shares": len(shares),
            "final_items": len(items),
        },
        flush=True,
    )

    return items

# -----------------------------
# FEATURE ENGINE
# -----------------------------
def annotate_features(qs, user, joined_communities, starred_ids, two_weeks_ago):

    return qs.annotate(
        total_skipped=F("skipped_views"),

        skip_rate=Coalesce(
          ExpressionWrapper(
              F("total_skipped") * 1.0 /
              NullIf(F("views_count"), Value(0)),
              output_field=FloatField(),
          ),
          Value(0.0),
        ),

        is_joined_community=Case(
          When(
              community_id__in=joined_communities,
              then=Value(1.0)
          ),
          default=Value(0.0),
          output_field=FloatField(),
        ),

        is_recent=Case(
            When(created_at__gte=two_weeks_ago, then=Value(1.0)),
            default=Value(0.0),
            output_field=FloatField()
        ),

        is_popular=Case(
            When(likes_count__gte=10, comments_count__gte=3, then=Value(1.0)),
            default=Value(0.0),
            output_field=FloatField()
        ),

        is_repost=Case(
            When(repost_count__gt=0, then=Value(1.0)),
            default=Value(0.0),
            output_field=FloatField()
        ),

        is_starred_by_user = Case(
            When(user_id__in=starred_ids, then=Value(1.0)),
            default=Value(0.0),
            output_field=FloatField()
        )
    )

def annotate_share_features(
    qs,
    user,
    joined_communities,
    starred_ids,
    two_weeks_ago
):
    return qs.annotate(
        total_views=F("views_count"),
        total_skipped=F("skipped_views"),

        skip_rate=Case(
            When(
                total_views=0,
                then=Value(0.0)
            ),
            default=ExpressionWrapper(
                F("total_skipped") * 1.0 /
                F("total_views"),
                output_field=FloatField()
            ),
            output_field=FloatField()
        ),

        is_joined_community=Case(
            When(
                community_id__in=joined_communities,
                then=Value(1.0)
            ),
            default=Value(0.0),
            output_field=FloatField(),
        ),

        is_recent=Case(
            When(
                created_at__gte=two_weeks_ago,
                then=Value(1.0)
            ),
            default=Value(0.0),
            output_field=FloatField()
        ),

        is_popular=Case(
            When(
                likes_count__gte=10,
                comments_count__gte=3,
                then=Value(1.0)
            ),
            default=Value(0.0),
            output_field=FloatField()
        ),

        is_repost=Value(
            0.0,
            output_field=FloatField()
        ),

        is_starred_by_user=Case(
            When(
                user_id__in=starred_ids,
                then=Value(1.0)
            ),
            default=Value(0.0),
            output_field=FloatField()
        )
    )

def annotate_share_features(
    qs,
    user,
    joined_communities,
    starred_ids,
    two_weeks_ago,
):
    return qs.annotate(
        total_skipped=F("skipped_views"),

        skip_rate=Coalesce(
            ExpressionWrapper(
                F("total_skipped") * 1.0 /
                NullIf(
                    F("views_count"),
                    Value(0)
                ),
                output_field=FloatField(),
            ),
            Value(0.0),
        ),

        is_joined_community=Case(
            When(
                community_id__in=joined_communities,
                then=Value(1.0),
            ),
            default=Value(0.0),
            output_field=FloatField(),
        ),

        is_recent=Case(
            When(
                post__created_at__gte=two_weeks_ago,
                then=Value(1.0),
            ),
            default=Value(0.0),
            output_field=FloatField(),
        ),

        is_popular=Case(
            When(
                likes_count__gte=10,
                comments_count__gte=3,
                then=Value(1.0),
            ),
            default=Value(0.0),
            output_field=FloatField(),
        ),

        is_repost=Value(
            0.0,
            output_field=FloatField(),
        ),

        is_starred_by_user=Case(
            When(
                post__user_id__in=starred_ids,
                then=Value(1.0),
            ),
            default=Value(0.0),
            output_field=FloatField(),
        ),
    )

def annotate_repost_features(
    qs,
    user,
    joined_communities,
    starred_ids,
    two_weeks_ago
):
    return qs.annotate(
        total_skipped=F("skipped_views"),

        skip_rate=Coalesce(
          ExpressionWrapper(
              F("total_skipped") * 1.0 /
              NullIf(F("views_count"), Value(0)),
              output_field=FloatField(),
          ),
          Value(0.0),
        ),

        is_joined_community=Case(
            When(
                post__community_id__in=joined_communities,
                then=Value(1.0)
            ),
            default=Value(0.0),
            output_field=FloatField(),
        ),

        is_recent=Case(
            When(
                created_at__gte=two_weeks_ago,
                then=Value(1.0)
            ),
            default=Value(0.0),
            output_field=FloatField()
        ),

        is_popular=Case(
            When(
                likes_count__gte=10,
                comments_count__gte=3,
                then=Value(1.0)
            ),
            default=Value(0.0),
            output_field=FloatField()
        ),

        is_repost=Value(
            1.0,
            output_field=FloatField()
        ),

        is_starred_by_user = Case(
            When(user_id__in=starred_ids, then=Value(1.0)),
            default=Value(0.0),
            output_field=FloatField()
        )
    )

def compute_main_feed_score(qs, weights):

    return qs.annotate(
        final_score=ExpressionWrapper(
            F("likes_count") * Value(weights["like"]) +
            F("comments_count") * Value(weights["comment"]) +
            F("shares_count") * Value(weights["share"]) +
            F("views_count") * Value(weights["view"]) +

            F("is_starred_by_user") * Value(weights["star"]) +
            F("is_joined_community") * Value(weights["community"]) +
            F("is_recent") * Value(weights["recent"]) +
            F("skip_rate") * Value(weights["skip"]) +
            F("is_popular") * Value(weights["popular"]) +
            F("is_repost") * Value(weights["repost"]),
            output_field=FloatField(),
        )
    )

def finalize_feed(items, user):
    seen_ids = set(get_seen_posts(redis_client, user.id))
    seed = session_seed(user)

    for item in items:
      if item["type"] == "post":
          post_id = item["data"].id
          content_id = item["data"].id
          created_at = item["data"].created_at
  
      elif item["type"] == "repost":
          post_id = item["data"].post_id
          content_id = item["data"].post_id
          created_at = item["data"].created_at
  
      elif item["type"] == "share":
          post_id = item["data"].post_id
          content_id = item["data"].post_id
          created_at = item["data"].created_at
  
      else:
          continue
  
      base_penalty = (
          -2.5
          if post_id in seen_ids
          else 0
      )
  
      shuffle = (
          content_id + seed
      ) % 13
  
      decay = time_decay(created_at)
  
      item["final_score"] = (
          item["score"]
          + decay * 3
          + shuffle * 0.05
          + base_penalty
      )
  
    items.sort(key=lambda x: x["final_score"], reverse=True)

    chunk_size = 10
    
    result = []
    
    rng = random.Random(seed)
    
    for i in range(0, min(50, len(items)), chunk_size):
        chunk = items[i:i + chunk_size]
        rng.shuffle(chunk)
        result.extend(chunk)
    
    result.extend(items[50:])
    
    return result

def build_reels_queryset(user):
    muted_ids = user.muted_users.values_list(
        "muted_user_id",
        flat=True,
    )

    blocked_ids = user.blocked_users.values_list(
        "blocked_user_id",
        flat=True,
    )

    blocked_me_ids = BlockedUser.objects.filter(
        blocked_user=user
    ).values_list(
        "user_id",
        flat=True,
    )

    return (
        Post.objects.filter(
            content_type="short_video",
            is_deleted=False,
            is_approved=True,
            community__tribe__allow_reels=True,
        )
        .exclude(user_id__in=muted_ids)
        .exclude(user_id__in=blocked_ids)
        .exclude(user_id__in=blocked_me_ids)
        .select_related(
            "user",
            "community",
        )
        .prefetch_related(
            "media_files__asset",
        )
        .annotate(
            likes_count=Count("likes", distinct=True),
            comments_count=Count(
                "comments",
                filter=Q(comments__is_deleted=False),
                distinct=True,
            ),
            shares_count=Count(
                "shares",
                filter=Q(
                    shares__is_deleted=False,
                    shares__status="approved",
                ),
                distinct=True,
            ),
            is_liked=Exists(
                Like.objects.filter(
                    post=OuterRef("pk"),
                    user=user,
                )
            ),
            is_starred=Exists(
                Star.objects.filter(
                    star=user,
                    starred_user=OuterRef("user_id"),
                )
            ),
        )
    )

def annotate_reels_features(qs, joined_communities):

    return qs.annotate(
        skip_rate=Coalesce(
          ExpressionWrapper(
              F("skipped_views") * 1.0 /
              NullIf(F("views_count"), Value(0)),
              output_field=FloatField(),
          ),
          Value(0.0),
        ),

        completion_rate=Coalesce(
          ExpressionWrapper(
              Value(1.0) -
              (
                  F("skipped_views") * 1.0 /
                  NullIf(F("views_count"), Value(0))
              ),
              output_field=FloatField(),
          ),
          Value(0.0),
        ),

        watch_score=ExpressionWrapper(
            F("views_count") +
            F("replay_count") * 2,
            output_field=FloatField(),
        ),

        is_joined_community=Case(
            When(
                community_id__in=joined_communities,
                then=Value(1.5),
            ),
            default=Value(0.0),
            output_field=FloatField(),
        ),
    )
  
def compute_reels_score(qs):
    return qs.annotate(
        final_score=ExpressionWrapper(
            F("views_count") * Value(0.1) +
            F("likes_count") * 2 +
            F("comments_count") * 3 +
            F("shares_count") * 8 +
            F("watch_score") * 4 +
            F("completion_rate") * 10 +
            F("is_joined_community") * 5 +
            F("skip_rate") * -7 +
            Least(F("replay_count"), Value(5)) * 6,
            output_field=FloatField(),
        )
    )

def finalize_reels(reels, user):
    seen_ids = set(get_seen_posts(redis_client, user.id))
    seed = session_seed(user)

    interest_map = get_interest_map(user)

    for reel in reels:

        bonus = sum(
            interest_map.get(str(topic).lower(), 0)
            for topic in (reel.topics or [])
        )

        decay = time_decay(reel.created_at)

        digest = hashlib.md5(
            f"{reel.id}:{seed}".encode()
        ).hexdigest()

        shuffle = (
            ((int(digest[:8], 16) % 1000) / 1000 - 0.5)
            * 40
        )

        base_penalty = (
            -2.5
            if reel.id in seen_ids
            else 0
        )

        reel.final_score += (
            bonus +
            decay * 5 +
            shuffle * 0.15 +
            base_penalty
        )

    reels.sort(
        key=lambda x: x.final_score,
        reverse=True,
    )

    top = reels[:50]
    rest = reels[50:]

    rng = random.Random(seed)
    rng.shuffle(top)

    return top + rest

def time_decay(created_at):
    now = timezone.now()
    hours = (now - created_at).total_seconds() / 3600

    if hours <= 24:
        return 1.0          # first day
    elif hours <= 72:
        return 0.9          # 3 days
    elif hours <= 168:
        return 0.75         # 1 week
    elif hours <= 336:
        return 0.55         # 2 weeks
    elif hours <= 720:
        return 0.35         # 1 month
    else:
        return 0.15         # older

# -----------------------------
# SESSION RANDOMNESS (TIKTOK STYLE)
# -----------------------------
def session_seed(user):

    key = f"feed_seed:{user.id}"

    existing = redis_client.get(key)

    if existing:
        try:
            return int(existing)
        except:
            pass

    import random

    seed = random.randint(1, 999999)

    redis_client.set(
        key,
        seed,
        ex=1800
    )

    return seed