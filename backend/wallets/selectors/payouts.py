# wallet/selectors/payouts.py

from django.db.models import QuerySet

from wallets.models import (
    Payout,
    Withdrawal,
)


# ============================================================
# WITHDRAWALS
# ============================================================

def get_user_withdrawals(
    user,
    status: str | None = None,
) -> QuerySet:
    """
    Return withdrawals belonging to the authenticated user.
    """

    queryset = (
        Withdrawal.objects
        .filter(
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "bank_account",
        )
        .order_by(
            "-created_at",
        )
    )

    if status:
        queryset = queryset.filter(
            status=status,
        )

    return queryset


def get_withdrawal_by_id(
    user,
    withdrawal_id,
):
    """
    Retrieve a single withdrawal belonging to the user.
    """

    return (
        Withdrawal.objects
        .filter(
            id=withdrawal_id,
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "bank_account",
        )
        .first()
    )


def get_withdrawal_by_reference(
    user,
    reference: str,
):
    """
    Retrieve withdrawal by reference.
    """

    return (
        Withdrawal.objects
        .filter(
            reference=reference,
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "bank_account",
        )
        .first()
    )


# ============================================================
# PAYOUTS
# ============================================================

def get_user_payouts(
    user,
    status: str | None = None,
) -> QuerySet:
    """
    Return payout records belonging to the user.
    """

    queryset = (
        Payout.objects
        .filter(
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "withdrawal",
            "withdrawal__bank_account",
        )
        .order_by(
            "-created_at",
        )
    )

    if status:
        queryset = queryset.filter(
            status=status,
        )

    return queryset


def get_recent_payouts(
    user,
    limit: int = 10,
):
    """
    Return recent payout history for dashboard.
    """

    return (
        get_user_payouts(user)
        [:limit]
    )


def get_payout_by_id(
    user,
    payout_id,
):
    """
    Retrieve one payout belonging to the user.
    """

    return (
        Payout.objects
        .filter(
            id=payout_id,
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "withdrawal",
            "withdrawal__bank_account",
        )
        .first()
    )


def get_payout_by_reference(
    user,
    provider_reference: str,
):
    """
    Retrieve payout using provider reference.
    """

    return (
        Payout.objects
        .filter(
            provider_reference=provider_reference,
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "withdrawal",
            "withdrawal__bank_account",
        )
        .first()
    )


def get_completed_payouts(
    user,
) -> QuerySet:
    """
    Return completed payouts.
    """

    return get_user_payouts(
        user,
        status="completed",
    )


def get_pending_payouts(
    user,
) -> QuerySet:
    """
    Return pending payouts.
    """

    return get_user_payouts(
        user,
        status="pending",
    )