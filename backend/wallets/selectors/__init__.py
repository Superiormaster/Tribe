# wallet/selectors/__init__.py

from .wallet import (
    get_user_wallet,
    get_user_bank_accounts,
)

from .transactions import (
    get_user_transactions,
    get_transaction_by_reference,
    get_transaction_by_id,
    get_recent_transactions,
)

from .revenue import (
    get_user_revenue,
    get_revenue_by_period,
    get_revenue_by_source,
    get_revenue_source_totals,
)

from .payouts import (
    get_user_withdrawals,
    get_user_payouts,
    get_recent_payouts,
    get_payout_by_id,
)

from .dashboard import (
    get_dashboard_data,
)

__all__ = [
    # Wallet
    "get_user_wallet",
    "get_user_bank_accounts",

    # Transactions
    "get_user_transactions",
    "get_transaction_by_reference",
    "get_transaction_by_id",
    "get_recent_transactions",

    # Revenue
    "get_user_revenue",
    "get_revenue_by_period",
    "get_revenue_by_source",
    "get_revenue_source_totals",

    # Payouts
    "get_user_withdrawals",
    "get_user_payouts",
    "get_recent_payouts",
    "get_payout_by_id",

    # Dashboard
    "get_dashboard_data",
]