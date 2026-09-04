# wallet/services/wallet.py

from django.db import transaction

from wallets.models import Wallet
from wallets.constants import DEFAULT_CURRENCY


def get_or_create_wallet(
    user,
    currency: str = DEFAULT_CURRENCY,
):
    """
    Get the user's wallet or create it.

    This operation is safe to call multiple times.

    Wallets are one-to-one with users.
    """

    wallet, created = Wallet.objects.get_or_create(
        user=user,
        defaults={
            "currency": currency.upper(),
        },
    )

    return wallet


def get_locked_wallet(
    user,
):
    """
    Retrieve the user's wallet with a database row lock.

    IMPORTANT:
    This must be called inside transaction.atomic().

    The lock prevents two simultaneous requests from
    modifying the same wallet balance incorrectly.
    """

    return (
        Wallet.objects
        .select_for_update()
        .get(
            user=user,
        )
    )


def get_locked_wallet_by_id(
    wallet_id,
):
    """
    Retrieve a wallet by ID with a row lock.

    Must be called inside transaction.atomic().
    """

    return (
        Wallet.objects
        .select_for_update()
        .get(
            id=wallet_id,
        )
    )


def ensure_wallet(
    user,
    currency: str = DEFAULT_CURRENCY,
):
    """
    Ensure the user has a wallet.

    This is useful during onboarding or when a user
    first enters monetization.
    """

    return get_or_create_wallet(
        user=user,
        currency=currency,
    )