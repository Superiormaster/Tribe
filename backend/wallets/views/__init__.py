# wallet/views/__init__.py

from .dashboard import MonetizationDashboardView
from .wallet import WalletView
from .transactions import TransactionListView
from .withdrawals import WithdrawalCreateView
from .payouts import PayoutListView
from .revenue import RevenueView
from .rewards import RewardListView
from .goals import GoalListCreateView
from .insights import InsightListView


__all__ = [
    "MonetizationDashboardView",
    "WalletView",
    "TransactionListView",
    "WithdrawalCreateView",
    "PayoutListView",
    "RevenueView",
    "RewardListView",
    "GoalListCreateView",
    "InsightListView",
]