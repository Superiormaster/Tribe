# wallets/services/insights.py

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone

from wallets.constants import PERIOD_30D, PERIOD_DAYS
from wallets.models import (
    Revenue,
    WalletTransaction,
    Withdrawal,
)


def get_period_days(period: str = PERIOD_30D) -> int:
    """
    Convert frontend period values into number of days.

    Supported:
        7d
        30d
        90d
        1y
    """

    return PERIOD_DAYS.get(
        period,
        PERIOD_DAYS[PERIOD_30D],
    )


def get_revenue_growth(
    user,
    days: int = 30,
):
    """
    Compare current revenue against the
    previous equivalent period.
    """

    now = timezone.now()

    current_start = (
        now - timedelta(days=days)
    )

    previous_start = (
        current_start
        - timedelta(days=days)
    )

    current = (
        Revenue.objects
        .filter(
            user=user,
            created_at__gte=current_start,
            created_at__lte=now,
        )
        .aggregate(
            total=Sum("amount")
        )["total"]
        or Decimal("0")
    )

    previous = (
        Revenue.objects
        .filter(
            user=user,
            created_at__gte=previous_start,
            created_at__lt=current_start,
        )
        .aggregate(
            total=Sum("amount")
        )["total"]
        or Decimal("0")
    )

    if previous == 0:

        if current > 0:
            growth = Decimal("100")
        else:
            growth = Decimal("0")

    else:

        growth = (
            (current - previous)
            / previous
        ) * Decimal("100")

    return {
        "current": current,
        "previous": previous,
        "growth_percent": growth,
    }


def get_top_revenue_sources(
    user,
    days: int = 30,
    limit: int = 5,
):
    """
    Return the creator's strongest
    revenue sources.
    """

    start = (
        timezone.now()
        - timedelta(days=days)
    )

    return (
        Revenue.objects
        .filter(
            user=user,
            created_at__gte=start,
        )
        .values(
            "source",
            "currency",
        )
        .annotate(
            total=Sum("amount"),
            count=Count("id"),
        )
        .order_by(
            "-total",
        )[:limit]
    )


def get_transaction_summary(
    user,
    days: int = 30,
):
    """
    Return transaction counts grouped
    by status.
    """

    start = (
        timezone.now()
        - timedelta(days=days)
    )

    transactions = (
        WalletTransaction.objects
        .filter(
            wallet__user=user,
            created_at__gte=start,
        )
    )

    return {
        "total": transactions.count(),

        "completed": transactions.filter(
            status="completed",
        ).count(),

        "pending": transactions.filter(
            status="pending",
        ).count(),

        "failed": transactions.filter(
            status="failed",
        ).count(),

        "cancelled": transactions.filter(
            status="cancelled",
        ).count(),
    }


def get_withdrawal_summary(
    user,
    days: int = 30,
):
    """
    Return withdrawal statistics.
    """

    start = (
        timezone.now()
        - timedelta(days=days)
    )

    withdrawals = (
        Withdrawal.objects
        .filter(
            wallet__user=user,
            created_at__gte=start,
        )
    )

    totals = withdrawals.aggregate(
        total=Sum("amount")
    )

    return {
        "count": withdrawals.count(),

        "total_amount": (
            totals["total"]
            or Decimal("0")
        ),

        "completed": withdrawals.filter(
            status="completed",
        ).count(),

        "pending": withdrawals.filter(
            status__in=[
                "pending",
                "processing",
            ],
        ).count(),

        "failed": withdrawals.filter(
            status="failed",
        ).count(),
    }


def build_insight_list(
    growth,
    sources,
    transactions,
    withdrawals,
):
    """
    Convert raw analytics into the compact
    insight cards consumed by the frontend.
    """

    insights = []

    growth_percent = growth[
        "growth_percent"
    ]

    # ========================================================
    # REVENUE GROWTH
    # ========================================================

    if growth_percent > 0:

        insights.append({
            "id": "revenue-growth",
            "type": "positive",
            "title": "Revenue is growing",
            "description": (
                "Your revenue is higher than "
                "the previous period."
            ),
            "value": growth_percent,
            "unit": "percent",
        })

    elif growth_percent < 0:

        insights.append({
            "id": "revenue-decline",
            "type": "warning",
            "title": "Revenue has declined",
            "description": (
                "Your revenue is lower than "
                "the previous period."
            ),
            "value": growth_percent,
            "unit": "percent",
        })

    else:

        insights.append({
            "id": "revenue-stable",
            "type": "neutral",
            "title": "Revenue is stable",
            "description": (
                "Your revenue has remained "
                "relatively stable."
            ),
            "value": growth_percent,
            "unit": "percent",
        })

    # ========================================================
    # TOP REVENUE SOURCE
    # ========================================================

    if sources:

        top_source = sources[0]

        source_name = (
            top_source["source"]
            .replace("_", " ")
            .title()
        )

        insights.append({
            "id": "top-revenue-source",
            "type": "positive",
            "title": "Top revenue source",
            "description": (
                f"{source_name} is your "
                "strongest revenue source."
            ),
            "value": top_source["total"],
            "unit": "currency",
        })

    # ========================================================
    # PENDING TRANSACTIONS
    # ========================================================

    if transactions["pending"] > 0:

        insights.append({
            "id": "pending-transactions",
            "type": "neutral",
            "title": "Pending transactions",
            "description": (
                "Some of your earnings are "
                "still being processed."
            ),
            "value": transactions["pending"],
            "unit": "count",
        })

    # ========================================================
    # SUCCESSFUL PAYOUTS
    # ========================================================

    if withdrawals["completed"] > 0:

        insights.append({
            "id": "successful-payouts",
            "type": "positive",
            "title": "Successful payouts",
            "description": (
                "You have successfully "
                "withdrawn earnings."
            ),
            "value": withdrawals[
                "total_amount"
            ],
            "unit": "currency",
        })

    return insights


def get_creator_insights(
    user,
    days: int = 30,
):
    """
    Build the complete monetization insight
    payload.
    """

    growth = get_revenue_growth(
        user=user,
        days=days,
    )

    sources = list(
        get_top_revenue_sources(
            user=user,
            days=days,
        )
    )

    transactions = get_transaction_summary(
        user=user,
        days=days,
    )

    withdrawals = get_withdrawal_summary(
        user=user,
        days=days,
    )

    insights = build_insight_list(
        growth=growth,
        sources=sources,
        transactions=transactions,
        withdrawals=withdrawals,
    )

    return {
        "period_days": days,
        "revenue_growth": growth,
        "top_sources": sources,
        "transactions": transactions,
        "withdrawals": withdrawals,
        "insights": insights,
    }


def get_insights(
    user,
    period: str = PERIOD_30D,
):
    """
    Public service used by InsightListView.

    Converts:
        7d
        30d
        90d
        1y

    into the number of days expected by
    get_creator_insights().
    """

    days = get_period_days(
        period
    )

    return get_creator_insights(
        user=user,
        days=days,
    )