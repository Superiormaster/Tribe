# feed/services.py

import hashlib
from django.db.models import *
from django.utils import timezone
from datetime import timedelta
from .models import Post, Repost, Like
from users.models import BlockedUser
from .weights import get_user_weights
from .cache import *
from django.db.models.functions import Least, Cast
from users.utils import redis_client, get_interest_map
from django.db.models import Avg, Count, Sum, Case, When, Value, FloatField, ExpressionWrapper, IntegerField, F, Q, Exists, OuterRef
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
      "media_files"
    ).annotate(
        likes_count=Count("likes", distinct=True),
        comments_count=Count("comments", distinct=True),
        shares_count=Count("shares", distinct=True),
        repost_count=Count("reposts", distinct=True),
        is_liked=Exists(
            Like.objects.filter(
                post=OuterRef("pk"),
                user=user
            )
        )
    )

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
  
    cached = get_cached_feed(redis_client, user.id, tribe_id)

    if cached:
        post_ids = [
            item["id"]
            for item in cached
            if item["type"] == "post"
        ]
    
        repost_ids = [
            item["id"]
            for item in cached
            if item["type"] == "repost"
        ]
    
        post_map = {
          p.id: p
          for p in compute_main_feed_score(
              annotate_features(
                  build_base_queryset(user).filter(id__in=post_ids),
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
            for r in 
              compute_main_feed_score(
                annotate_repost_features(
                  Repost.objects.filter(
                      id__in=repost_ids,
                      is_deleted=False,
                  )
                  .select_related(
                      "user",
                      "post",
                      "post__user",
                      "post__community",
                  )
                  .annotate(
                      likes_count=Count("post__likes", distinct=True),
                      comments_count=Count("post__comments", distinct=True),
                      shares_count=Count("post__shares", distinct=True),
                      repost_count=Count("post__reposts", distinct=True),
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
    
        items = []
    
        for item in cached:
    
            if item["type"] == "post":
    
                obj = post_map.get(item["id"])
    
                if obj:
                    items.append({
                        "type": "post",
                        "data": obj,
                    })
    
            else:
    
                obj = repost_map.get(item["id"])
    
                if obj:
                    items.append({
                        "type": "repost",
                        "data": obj,
                    })
    
        for item in items:
            topics = (
                item["data"].topics
                if item["type"] == "post"
                else item["data"].post.topics
            )
    
            bonus = sum(
                interest_map.get(str(topic).lower(), 0)
                for topic in (topics or [])
            )
        
            item["final_score"] = getattr(item["data"], "final_score", 0) + bonus
    
        items.sort(
            key=lambda x: x["final_score"],
            reverse=True,
        )
    
        return items

    posts = build_base_queryset(user)

    if tribe_id:
      # STRICT tribe feed
      posts = posts.filter(
          community__isnull=False,
          community__tribe_id=tribe_id,
      )
    else:
      pass

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

    reposts = Repost.objects.filter(
        is_deleted=False
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
            distinct=True
        ),
        shares_count=Count(
            "post__shares",
            distinct=True
        ),
        repost_count=Count(
            "post__reposts",
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
        })

    for r in reposts:
        items.append({
            "type": "repost",
            "data": r,
            "score": r.final_score,
            "created_at": r.created_at,
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
    
        else:
    
            cache_data.append({
                "type": "repost",
                "id": item["data"].id,
            })
  
    set_cached_feed(
        redis_client,
        user.id,
        cache_data,
        ttl=300,
        tribe_id=tribe_id,
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

# -----------------------------
# FINAL SCORE ENGINE
# -----------------------------
def compute_feed_scores(items, weights):
    scored = []

    for item in items:
        if item["type"] == "post":
            obj = item["obj"]

            score = (
                obj.likes_count * weights["like"] +
                obj.comments_count * weights["comment"] +
                obj.views_count * weights["view"] +
                obj.repost_count * weights["repost"]
            )

        else:
            r = item["obj"]
            post = r.post

            # REPOST inherits post score + repost bonus
            score = (
                r.likes_count * weights["like"] +
                r.comments_count * weights["comment"] +
                r.views_count * weights["view"] +
                r.repost_count * weights["repost"]
            )

        item["score"] = score
        scored.append(item)

    return scored

def compute_main_feed_score(qs, weights):

    return qs.annotate(
        final_score=ExpressionWrapper(
            F("likes_count") * Value(weights["like"]) +
            F("comments_count") * Value(weights["comment"]) +
            F("views_count") * Value(weights["view"]) +

            F("is_starred_by_user") * Value(weights["star"]) +
            F("is_joined_community") * Value(weights["community"]) +
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
        else:
            post_id = item["data"].post_id
        
        base_penalty = (
            -2.5
            if post_id in seen_ids
            else 0
        )

        if item["type"] == "post":
            content_id = item["data"].id
        else:
            content_id = item["data"].post_id

        digest = hashlib.md5(
            f"{content_id}:{seed}".encode()
        ).hexdigest()
        
        shuffle = int(digest[:8], 16) % 100

        decay = time_decay(item["created_at"])

        item["final_score"] = (
            item["score"]
            + decay * 3
            + shuffle * 0.05
            + base_penalty
        )

    return sorted(items, key=lambda x: x["final_score"], reverse=True)

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
            F("skip_rate") * -7 +
            Least(F("replay_count"), Value(5)) * 6,
            output_field=FloatField(),
        )
    )

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