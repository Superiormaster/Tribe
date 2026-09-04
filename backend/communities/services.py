# Community_feed/services.py

import hashlib
from django.db.models import *
from django.utils import timezone
from datetime import timedelta
from post.models import Post, Repost, Like, Share
from users.models import BlockedUser
from .weights import get_user_weights
from .cache import *
from django.db.models.functions import Least, Cast
import random
from users.utils import redis_client
from users.models import Star
from django.db.models import Avg, Count, Sum, Case, When, Value, FloatField, Exists, OuterRef, ExpressionWrapper, IntegerField, F
from itertools import chain
from django.utils.dateparse import parse_datetime
from post.serializers import PostSerializer, RepostSerializer, ShareSerializer


def build_community_feed(community, user, joined_communities, starred_ids, two_weeks_ago, tribe_id=None,):
    """
    Returns unified feed items (posts + reposts)
    """

    weights = get_user_weights(user)

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

    posts = Post.objects.filter(
        community=community,
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
    
        is_liked=Exists(
            Like.objects.filter(
                post=OuterRef("pk"),
                user=user
            )
        ),
    
        repost_count=Count(
            "reposts",
            filter=Q(reposts__is_deleted=False),
            distinct=True
        ),
    
        is_pinned=F("community_pinned"),
        pin_order=F("community_pin_order"),
    )

    shares = Share.objects.filter(
        community=community,
        is_deleted=False,
        status="approved",
        post__is_deleted=False,
        post__is_approved=True,
        post__is_rejected=False,
    ).select_related(
        "user",
        "post",
        "post__user",
        "post__community",
        "community",
    ).prefetch_related(
        "post__media_files__asset"
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
            distinct=True
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
    )

    shares = shares.exclude(
        post__user_id__in=muted_ids
    ).exclude(
        post__user_id__in=blocked_ids
    ).exclude(
        post__user_id__in=blocked_me_ids
    )

    if tribe_id:
      posts = posts.filter(
          community__tribe_id=tribe_id
      )
  
    posts = annotate_features(
        posts,
        user,
        joined_communities,
        starred_ids,
        two_weeks_ago
    )

    posts = compute_main_feed_score(
        posts,
        weights
    )

    if tribe_id:
      shares = shares.filter(
          community__tribe_id=tribe_id
      )

    shares = annotate_share_features(
        shares,
        user,
        joined_communities,
        starred_ids,
        two_weeks_ago
    )

    shares = compute_main_feed_score(
        shares,
        weights
    )

    reposts = Repost.objects.filter(
        post__community=community,
        post__is_deleted=False,
        post__is_approved=True,
    ).select_related(
        "user",
        "post",
        "post__user",
        "post__community",
    ).prefetch_related(
        "post__media_files__asset"
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
          post__community__tribe_id=tribe_id
      )

    reposts = annotate_repost_features(
        reposts,
        user,
        joined_communities,
        starred_ids,
        two_weeks_ago
    )

    reposts = compute_main_feed_score(
        reposts,
        weights
    )

    items = []

    for p in posts:
        items.append({
            "type": "post",
            "data": p,
            "score": p.final_score,
            "created_at": p.created_at,
            "community_pinned": p.community_pinned,
            "community_pin_order": p.community_pin_order or 0,
        })

    for r in reposts:
        items.append({
            "type": "repost",
            "data": r,
            "score": r.final_score,
            "created_at": r.created_at,
            "community_pinned": False,
            "community_pin_order": 0,
        })
  
    for s in shares:
      items.append({
          "type": "share",
          "data": s,
          "score": s.final_score,
          "created_at": s.created_at,
          "community_pinned": False,
          "community_pin_order": 0,
      })

    items.sort(
        key=lambda x: (
            x["community_pinned"],
            -x["community_pin_order"],
            x["created_at"].timestamp() if x["created_at"] else 0
        ),
        reverse=True
    )

    items = finalize_feed(
        items,
        user
    )

    return items

def serialize_community_feed(
    items,
    request,
    starred_ids
):

    results = []

    for item in items:

        if item["type"] == "post":

            post_data = PostSerializer(
                item["data"],
                context={
                    "request": request,
                    "starred_ids": starred_ids
                }
            ).data

            post_data["type"] = "post"

            results.append(post_data)

        elif item["type"] == "repost":

            repost_data = RepostSerializer(
                item["data"],
                context={
                    "request": request,
                    "starred_ids": starred_ids
                }
            ).data

            repost_data["type"] = "repost"

            results.append(repost_data)

        elif item["type"] == "share":

            share_data = ShareSerializer(
                item["data"],
                context={
                    "request": request,
                    "starred_ids": starred_ids
                }
            ).data

            share_data["type"] = "share"

            results.append(share_data)

    return results

# -----------------------------
# FEATURE ENGINE
# -----------------------------
def annotate_features(qs, user, joined_communities, starred_ids, two_weeks_ago):

    return qs.annotate(
        total_views=F("views_count"),
        total_skipped=F("skipped_views"),
        skip_rate = Case(
            When(total_views=0, then=Value(0.0)),
            default=ExpressionWrapper(
                F("total_skipped") * 1.0 / F("total_views"),
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
                post__user_id__in=starred_ids,
                then=Value(1.0)
            ),
            default=Value(0.0),
            output_field=FloatField()
        )
    )

def annotate_repost_features(
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
            When(total_views=0, then=Value(0.0)),
            default=ExpressionWrapper(
                F("total_skipped") * 1.0 /
                F("total_views"),
                output_field=FloatField()
            ),
            output_field=FloatField()
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
            F("skip_rate") * Value(weights["skip"]) +
            F("is_recent") * Value(weights["recent"]) +
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