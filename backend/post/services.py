# feed/services.py

import hashlib
from django.db.models import *
from django.utils import timezone
from datetime import timedelta
from .models import Post

from .weights import get_user_weights
from .cache import *
from django.db.models.functions import Least, Cast
from users.utils import redis_client
from django.db.models import Avg, Count, Sum, Case, When, Value, FloatField, ExpressionWrapper, IntegerField

# -----------------------------
# BASE QUERYSET
# -----------------------------
def build_base_queryset(user):
    return Post.objects.filter(
        is_deleted=False,
        is_approved=True
    ).select_related("user", "community").annotate(
        likes_count=Count("likes", distinct=True),
        comments_count=Count("comments", distinct=True),
        shares_count = Count('shares', distinct=True),
        repost_count=Count("reposts", distinct=True),
    )


# -----------------------------
# FEATURE ENGINE
# -----------------------------
def annotate_features(qs, user, interests, starred_ids, two_weeks_ago):

    return qs.annotate(
        is_star=Case(
            When(user_id__in=starred_ids, then=Value(1.0)),
            default=Value(0.0),
            output_field=FloatField()
        ),

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

        is_interest=Case(
            When(user__interests__overlap=interests, then=Value(1.0)),
            default=Value(0.0),
            output_field=FloatField()
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
    )


# -----------------------------
# FINAL SCORE ENGINE
# -----------------------------
def compute_main_feed_score(qs, weights):

    return qs.annotate(
        final_score=(
            F("likes_count") * Value(weights["like"]) +
            F("comments_count") * Value(weights["comment"]) +
            F("views_count") * Value(weights["view"]) +

            F("is_star") * Value(weights["star"]) +
            F("is_interest") * Value(weights["interest"]) +
            F("is_recent") * Value(weights["recent"]) +
            F("is_popular") * Value(weights["popular"]) +
            F("is_repost") * Value(weights["repost"])
        )
    )

def compute_reels_score(qs):

    return qs.annotate(
        final_score=(
            F("avg_watch_time") * 4 +
            F("completion_rate") * 10 +
            Least(F("replay_count"), Value(5)) * 6 +
            F("shares_count") * 8 -
            F("skip_rate") * 7
        )
    )

def time_decay(created_at):
    now = timezone.now()
    hours = (now - created_at).total_seconds() / 3600

    if hours < 24:
        return 1.0
    elif hours < 168:
        return 0.7
    elif hours < 336:
        return 0.4
    return 0.2

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