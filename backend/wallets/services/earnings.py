# wallet/services/earnings.py

from decimal import Decimal

from django.db import transaction

from wallets.models import Wallet

from wallets.services.transactions import (
    create_transaction,
    complete_transaction,
)

from wallets.utils.currency import (
    validate_positive_amount,
    quantize_money,
)

from wallets.utils.reference import (
    generate_transaction_reference,
)


def add_earning(
    wallet: Wallet,
    amount,
    description: str,
    *,
    pending: bool = True,
    currency: str | None = None,
    metadata: dict | None = None,
):
    """
    Add creator earnings to a wallet.

    pending=True:
        Adds money to pending_balance.

    pending=False:
        Adds money directly to available_balance.

    The entire operation is atomic.
    """

    amount = validate_positive_amount(
        amount
    )

    currency = (
        currency
        or wallet.currency
    ).upper()

    with transaction.atomic():

        # Re-fetch wallet with row lock.
        locked_wallet = (
            Wallet.objects
            .select_for_update()
            .get(
                id=wallet.id,
            )
        )

        if pending:

            locked_wallet.pending_balance = (
                quantize_money(
                    locked_wallet.pending_balance
                    + amount
                )
            )

            transaction_status = "pending"

        else:

            locked_wallet.available_balance = (
                quantize_money(
                    locked_wallet.available_balance
                    + amount
                )
            )

            locked_wallet.lifetime_earnings = (
                quantize_money(
                    locked_wallet.lifetime_earnings
                    + amount
                )
            )

            transaction_status = "completed"

        locked_wallet.save(
            update_fields=[
                "pending_balance",
                "available_balance",
                "lifetime_earnings",
                "updated_at",
            ]
        )

        wallet_transaction = create_transaction(
            wallet=locked_wallet,
            transaction_type="earning",
            amount=amount,
            description=description,
            status=transaction_status,
            currency=currency,
            metadata=metadata or {},
            reference=generate_transaction_reference(),
        )

        return (
            locked_wallet,
            wallet_transaction,
        )


def move_pending_to_available(
    wallet: Wallet,
    amount,
    description: str = "Earnings released",
    metadata: dict | None = None,
):
    """
    Move earnings from pending balance to available balance.

    Example:

        pending:   ₦50,000
        available: ₦20,000

        release ₦10,000

        pending:   ₦40,000
        available: ₦30,000
    """

    amount = validate_positive_amount(
        amount
    )

    with transaction.atomic():

        locked_wallet = (
            Wallet.objects
            .select_for_update()
            .get(
                id=wallet.id,
            )
        )

        if (
            locked_wallet.pending_balance
            < amount
        ):
            raise ValueError(
                "Insufficient pending balance."
            )

        locked_wallet.pending_balance = (
            quantize_money(
                locked_wallet.pending_balance
                - amount
            )
        )

        locked_wallet.available_balance = (
            quantize_money(
                locked_wallet.available_balance
                + amount
            )
        )

        locked_wallet.lifetime_earnings = (
            quantize_money(
                locked_wallet.lifetime_earnings
                + amount
            )
        )

        locked_wallet.save(
            update_fields=[
                "pending_balance",
                "available_balance",
                "lifetime_earnings",
                "updated_at",
            ]
        )

        wallet_transaction = create_transaction(
            wallet=locked_wallet,
            transaction_type="earning",
            amount=amount,
            description=description,
            status="completed",
            currency=locked_wallet.currency,
            metadata=metadata or {},
        )

        return (
            locked_wallet,
            wallet_transaction,
        )


def add_reward(
    wallet: Wallet,
    amount,
    description: str = "Audience reward",
    metadata: dict | None = None,
):
    """
    Add a reward directly to available balance.
    """

    amount = validate_positive_amount(
        amount
    )

    with transaction.atomic():

        locked_wallet = (
            Wallet.objects
            .select_for_update()
            .get(
                id=wallet.id,
            )
        )

        locked_wallet.available_balance = (
            quantize_money(
                locked_wallet.available_balance
                + amount
            )
        )

        locked_wallet.lifetime_earnings = (
            quantize_money(
                locked_wallet.lifetime_earnings
                + amount
            )
        )

        locked_wallet.save(
            update_fields=[
                "available_balance",
                "lifetime_earnings",
                "updated_at",
            ]
        )

        wallet_transaction = create_transaction(
            wallet=locked_wallet,
            transaction_type="reward",
            amount=amount,
            description=description,
            status="completed",
            currency=locked_wallet.currency,
            metadata=metadata or {},
        )

        return (
            locked_wallet,
            wallet_transaction,
        )