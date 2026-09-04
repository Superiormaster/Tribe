# wallet/selectors/transactions.py

from django.db.models import QuerySet

from wallets.models import WalletTransaction


def get_user_transactions(
    user,
    status: str | None = None,
    transaction_type: str | None = None,
    direction: str | None = None,
    currency: str | None = None,
) -> QuerySet:
    """
    Return transactions belonging to the authenticated user.

    All filtering happens through wallet__user so a user
    cannot accidentally retrieve another user's transactions.
    """

    queryset = (
        WalletTransaction.objects
        .filter(
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "revenue",
            "withdrawal",
        )
        .order_by(
            "-created_at",
        )
    )

    if status:
        queryset = queryset.filter(
            status=status,
        )

    if transaction_type:
        queryset = queryset.filter(
            transaction_type=transaction_type,
        )

    if direction:
        queryset = queryset.filter(
            direction=direction,
        )

    if currency:
        queryset = queryset.filter(
            currency=currency.upper(),
        )

    return queryset


def get_transaction_by_id(
    user,
    transaction_id,
):
    """
    Retrieve one transaction belonging to the user.
    """

    return (
        WalletTransaction.objects
        .filter(
            id=transaction_id,
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "revenue",
            "withdrawal",
        )
        .first()
    )


def get_transaction_by_reference(
    user,
    reference: str,
):
    """
    Retrieve a transaction using its unique reference.
    """

    return (
        WalletTransaction.objects
        .filter(
            reference=reference,
            wallet__user=user,
        )
        .select_related(
            "wallet",
            "revenue",
            "withdrawal",
        )
        .first()
    )


def get_recent_transactions(
    user,
    limit: int = 10,
):
    """
    Return recent transactions for dashboard display.
    """

    return (
        get_user_transactions(user)
        [:limit]
    )


def get_completed_transactions(
    user,
) -> QuerySet:
    """
    Return completed transactions.
    """

    return get_user_transactions(
        user,
        status="completed",
    )


def get_pending_transactions(
    user,
) -> QuerySet:
    """
    Return pending transactions.
    """

    return get_user_transactions(
        user,
        status="pending",
    )