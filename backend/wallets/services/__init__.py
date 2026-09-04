# wallet/services/__init__.py

from .wallet import (
    get_or_create_wallet,
    get_locked_wallet,
    get_locked_wallet_by_id,
    ensure_wallet,
)

from .earnings import (
    add_earning,
    move_pending_to_available,
    add_reward,
)

from .transactions import (
    create_transaction,
    complete_transaction,
    fail_transaction,
    cancel_transaction,
)

from .withdrawals import (
    create_withdrawal,
    cancel_withdrawal,
    mark_withdrawal_processing,
    mark_withdrawal_completed,
    mark_withdrawal_failed,
)

from .payouts import (
    create_payout,
    mark_payout_processing,
    complete_payout,
    fail_payout,
)

from .revenue import (
    record_revenue,
    record_ad_revenue,
    record_tip_revenue,
    record_subscription_revenue,
    record_sponsorship_revenue,
)

from .rewards import (
    create_reward,
    claim_reward,
    get_claimable_rewards,
)

from .goals import (
    create_goal,
    update_goal_progress,
    set_goal_progress,
    deactivate_goal,
)

from .insights import (
    get_revenue_growth,
    get_top_revenue_sources,
    get_transaction_summary,
    get_withdrawal_summary,
    get_creator_insights,
)

__all__ = [
    # Wallet
    "get_or_create_wallet",

    # Earnings
    "add_earning",
    "move_pending_to_available",

    # Transactions
    "create_transaction",
    "complete_transaction",
    "fail_transaction",
    "cancel_transaction",

    # Revenue
    "record_revenue",
]