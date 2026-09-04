# wallet/selectors/revenue.py

from datetime import timedelta

from django.db.models import (
    Count,
    QuerySet,
    Sum,
)
from django.db.models.functions import TruncDate
from django.utils import timezone

from wallets.constants import (
    PERIOD_1Y,
    PERIOD_30D,
    PERIOD_7D,
    PERIOD_90D,
    PERIOD_DAYS,
)
from wallets.models import Revenue


def get_user_revenue(
    user,
    status: str | None = None,
    source: str | None = None,
    currency: str | None = None,
) -> QuerySet:
    """
    Return revenue belonging to the authenticated user.
    """

    queryset = (
        Revenue.objects
        .filter(
            user=user,
        )
        .order_by(
            "-created_at",
        )
    )

    if status:
        queryset = queryset.filter(
            status=status,
        )

    if source:
        queryset = queryset.filter(
            source=source,
        )

    if currency:
        queryset = queryset.filter(
            currency=currency.upper(),
        )

    return queryset


def get_revenue_by_period(
    user,
    period: str = PERIOD_30D,
    status: str = "confirmed",
) -> QuerySet:
    """
    Return revenue for a selected period.

    Supported:
        7d
        30d
        90d
        1y
    """

    days = PERIOD_DAYS.get(
        period,
        PERIOD_DAYS[PERIOD_30D],
    )

    now = timezone.now()

    start_date = (
        now - timedelta(days=days)
    )

    return (
        get_user_revenue(
            user,
            status=status,
        )
        .filter(
            created_at__gte=start_date,
            created_at__lte=now,
        )
    )


def get_previous_period_revenue(
    user,
    period: str = PERIOD_30D,
    status: str = "confirmed",
) -> QuerySet:
    """
    Return the period immediately before the selected period.

    Used by EarningsOverview to calculate growth.
    """

    days = PERIOD_DAYS.get(
        period,
        PERIOD_DAYS[PERIOD_30D],
    )

    now = timezone.now()

    current_start = (
        now - timedelta(days=days)
    )

    previous_start = (
        current_start
        - timedelta(days=days)
    )

    return (
        get_user_revenue(
            user,
            status=status,
        )
        .filter(
            created_at__gte=previous_start,
            created_at__lt=current_start,
        )
    )


def get_revenue_by_source(
    user,
    period: str = PERIOD_30D,
    status: str = "confirmed",
):
    """
    Aggregate revenue by monetization source.

    Example result:

        ads           50000
        tips          20000
        subscriptions 10000
    """

    queryset = get_revenue_by_period(
        user,
        period=period,
        status=status,
    )

    return (
        queryset
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
        )
    )


def get_revenue_source_totals(
    user,
    period: str = PERIOD_30D,
):
    """
    Return only the totals needed for a revenue
    source breakdown.
    """

    queryset = get_revenue_by_period(
        user,
        period=period,
    )

    return (
        queryset
        .values("source")
        .annotate(
            total=Sum("amount"),
        )
        .order_by("-total")
    )


def get_revenue_chart(
    user,
    period: str = PERIOD_30D,
    status: str = "confirmed",
):
    """
    Return daily revenue totals.

    Designed for the frontend RevenueChart component.
    """

    queryset = get_revenue_by_period(
        user,
        period=period,
        status=status,
    )

    return (
        queryset
        .annotate(
            date=TruncDate(
                "created_at",
            )
        )
        .values(
            "date",
            "currency",
        )
        .annotate(
            amount=Sum("amount"),
        )
        .order_by(
            "date",
        )
    )


def get_total_revenue(
    user,
    period: str | None = None,
    status: str = "confirmed",
):
    """
    Return total revenue for the requested period.
    """

    if period:
        queryset = get_revenue_by_period(
            user,
            period=period,
            status=status,
        )
    else:
        queryset = get_user_revenue(
            user,
            status=status,
        )

    return (
        queryset
        .aggregate(
            total=Sum("amount"),
        )
        .get("total")
        or 0
    )


def get_revenue_count(
    user,
    period: str | None = None,
    status: str = "confirmed",
):
    """
    Return number of revenue records.
    """

    if period:
        queryset = get_revenue_by_period(
            user,
            period=period,
            status=status,
        )
    else:
        queryset = get_user_revenue(
            user,
            status=status,
        )

    return queryset.count()

def get_revenue_data(
    user,
    period: str = PERIOD_30D,
    source: str | None = None,
):
    """
    Build the complete response consumed by
    RevenueView.

    This combines:

        - revenue total
        - revenue count
        - source breakdown
        - chart data
        - selected source
    """

    revenue_queryset = get_revenue_by_period(
        user=user,
        period=period,
    )

    if source:
        revenue_queryset = revenue_queryset.filter(
            source=source,
        )

    total = (
        revenue_queryset
        .aggregate(
            total=Sum("amount"),
        )
        .get("total")
        or 0
    )

    count = revenue_queryset.count()

    source_rows = (
        revenue_queryset
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
        )
    )

    chart_rows = (
        revenue_queryset
        .annotate(
            date=TruncDate(
                "created_at",
            )
        )
        .values(
            "date",
            "currency",
        )
        .annotate(
            amount=Sum("amount"),
        )
        .order_by(
            "date",
        )
    )

    sources = []

    for row in source_rows:

        amount = row["total"] or 0

        percentage = (
            float(amount) / float(total) * 100
            if total
            else 0
        )

        sources.append({
            "id": row["source"],
            "name": row["source"].replace(
                "_",
                " ",
            ).title(),
            "source": row["source"],
            "amount": amount,
            "percentage": round(
                percentage,
                2,
            ),
            "currency": row["currency"],
            "transaction_count": row["count"],
        })

    chart = [
        {
            "date": row["date"],
            "amount": row["amount"] or 0,
            "currency": row["currency"],
        }
        for row in chart_rows
    ]

    return {
        "period": period,
        "source": source,
        "total": total,
        "count": count,
        "currency": (
            revenue_queryset
            .values_list(
                "currency",
                flat=True,
            )
            .first()
            or "NGN"
        ),
        "sources": sources,
        "chart": chart,
    }