from django.urls import path

from .views import MonetizationDashboardView, WalletView, TransactionListView, WithdrawalCreateView, PayoutListView, RevenueView, RewardListView, GoalListCreateView, InsightListView


urlpatterns = [
    path(
        "monetization/",
        MonetizationDashboardView.as_view(),
        name="monetization-dashboard",
    ),

    path(
        "",
        WalletView.as_view(),
        name="wallet",
    ),

    path(
        "transactions/",
        TransactionListView.as_view(),
        name="transactions",
    ),

    path(
        "withdraw/",
        WithdrawalCreateView.as_view(),
        name="withdraw",
    ),

    path(
        "payouts/",
        PayoutListView.as_view(),
        name="payouts",
    ),

    path(
        "revenue/",
        RevenueView.as_view(),
        name="revenue",
    ),

    path(
        "rewards/",
        RewardListView.as_view(),
        name="rewards",
    ),

    path(
        "goals/",
        GoalListCreateView.as_view(),
        name="goals",
    ),

    path(
        "insights/",
        InsightListView.as_view(),
        name="insights",
    ),
]