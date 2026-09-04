# wallet/selectors/wallet.py

from django.db.models import QuerySet

from wallets.models import (
    BankAccount,
    Wallet,
)


def get_user_wallet(
    user,
) -> Wallet | None:
    """
    Return the authenticated user's wallet.

    No wallet is created here.

    Wallet creation belongs in the wallet service.
    """

    return (
        Wallet.objects
        .filter(user=user)
        .first()
    )


def get_user_wallet_for_update(
    user,
) -> Wallet | None:
    """
    Return the user's wallet with a database row lock.

    This should ONLY be used inside transaction.atomic()
    when modifying wallet balances.
    """

    return (
        Wallet.objects
        .select_for_update()
        .filter(user=user)
        .first()
    )


def get_user_bank_accounts(
    user,
    active_only: bool = True,
) -> QuerySet:
    """
    Return the user's bank accounts.
    """

    queryset = BankAccount.objects.filter(
        user=user,
    )

    if active_only:
        queryset = queryset.filter(
            is_active=True,
        )

    return queryset.order_by(
        "-is_default",
        "-created_at",
    )


def get_default_bank_account(
    user,
) -> BankAccount | None:
    """
    Return the user's default active bank account.
    """

    return (
        BankAccount.objects
        .filter(
            user=user,
            is_active=True,
            is_default=True,
        )
        .first()
    )


def get_verified_bank_accounts(
    user,
) -> QuerySet:
    """
    Return verified active bank accounts.
    """

    return (
        BankAccount.objects
        .filter(
            user=user,
            is_active=True,
            is_verified=True,
        )
        .order_by(
            "-is_default",
            "-created_at",
        )
    )