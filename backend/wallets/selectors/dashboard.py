# wallet/selectors/dashboard.py

from django.db.models import (
    Count,
    Q,
    Sum,
)
from django.utils import timezone

from wallets.constants import (
    DASHBOARD_PAYOUT_LIMIT,
    DASHBOARD_TRANSACTION_LIMIT,
    PERIOD_30D,
)

from wallets.selectors.wallet import (
    get_user_wallet,
)

from wallets.selectors.transactions import (
    get_user_transactions,
)

from wallets.selectors.revenue import (
    get_revenue_by_period,
    get_revenue_chart,
    get_revenue_by_source,
    get_previous_period_revenue,
)

from wallets.selectors.payouts import (
    get_recent_payouts,
)


def get_dashboard_data(
    user,
    period: str = PERIOD_30D,
):
    """
    Collect all read-only data required by the
    monetization dashboard.
    """

    wallet = get_user_wallet(user)

    if not wallet:
        return {
            "wallet": None,
            "revenue": [],
            "previous_revenue": [],
            "revenue_chart": [],
            "revenue_sources": [],
            "transactions": [],
            "payouts": [],
            "revenue_total": 0,
            "revenue_count": 0,
            "previous_revenue_total": 0,
            "previous_revenue_count": 0,
            "completed_transactions": 0,
            "pending_transactions": 0,
            "generated_at": timezone.now(),
        }

    # ========================================================
    # REVENUE
    # ========================================================

    revenue_queryset = get_revenue_by_period(
        user,
        period=period,
        status="confirmed",
    )

    previous_revenue_queryset = (
        get_previous_period_revenue(
            user,
            period=period,
            status="confirmed",
        )
    )

    revenue_chart = get_revenue_chart(
        user,
        period=period,
        status="confirmed",
    )

    revenue_sources = get_revenue_by_source(
        user,
        period=period,
        status="confirmed",
    )

    # ========================================================
    # TRANSACTIONS
    # ========================================================

    transactions = (
        get_user_transactions(user)
        [:DASHBOARD_TRANSACTION_LIMIT]
    )

    transaction_counts = (
        get_user_transactions(user)
        .aggregate(
            completed=Count(
                "id",
                filter=Q(
                    status="completed"
                ),
            ),
            pending=Count(
                "id",
                filter=Q(
                    status="pending"
                ),
            ),
        )
    )

    # ========================================================
    # PAYOUTS
    # ========================================================

    payouts = get_recent_payouts(
        user,
        limit=DASHBOARD_PAYOUT_LIMIT,
    )

    # ========================================================
    # REVENUE TOTALS
    # ========================================================

    revenue_totals = (
        revenue_queryset
        .aggregate(
            total=Sum("amount"),
            count=Count("id"),
        )
    )

    previous_revenue_totals = (
        previous_revenue_queryset
        .aggregate(
            total=Sum("amount"),
            count=Count("id"),
        )
    )

    # ========================================================
    # RESULT
    # ========================================================

    return {
        "wallet": wallet,

        "revenue": revenue_queryset,

        "previous_revenue": (
            previous_revenue_queryset
        ),

        "revenue_chart": revenue_chart,

        "revenue_sources": (
            revenue_sources
        ),

        "transactions": transactions,

        "payouts": payouts,

        "revenue_total": (
            revenue_totals["total"]
            or 0
        ),

        "revenue_count": (
            revenue_totals["count"]
            or 0
        ),

        "previous_revenue_total": (
            previous_revenue_totals["total"]
            or 0
        ),

        "previous_revenue_count": (
            previous_revenue_totals["count"]
            or 0
        ),

        "completed_transactions": (
            transaction_counts[
                "completed"
            ]
            or 0
        ),

        "pending_transactions": (
            transaction_counts[
                "pending"
            ]
            or 0
        ),

        "generated_at": timezone.now(),
    }