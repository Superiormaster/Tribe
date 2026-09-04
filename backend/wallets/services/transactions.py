# wallet/services/transactions.py

from decimal import Decimal

from django.db import transaction as db_transaction

from wallets.models import (
    Wallet,
    WalletTransaction,
)

from wallets.utils.currency import (
    quantize_money,
    validate_positive_amount,
)

from wallets.utils.reference import (
    generate_transaction_reference,
)


def create_transaction(
    wallet: Wallet,
    transaction_type: str,
    amount,
    description: str,
    status: str = "pending",
    currency: str | None = None,
    metadata: dict | None = None,
    reference: str | None = None,
):
    """
    Create a wallet transaction ledger entry.

    This function does NOT modify wallet balances.

    Balance mutations belong to the earnings/withdrawal
    services.
    """

    amount = validate_positive_amount(
        amount
    )

    currency = (
        currency
        or wallet.currency
    ).upper()

    if metadata is None:
        metadata = {}

    if reference is None:
        reference = generate_transaction_reference()

    return WalletTransaction.objects.create(
        wallet=wallet,
        transaction_type=transaction_type,
        status=status,
        amount=amount,
        currency=currency,
        description=description,
        reference=reference,
        metadata=metadata,
    )


def complete_transaction(
    transaction_id,
):
    """
    Mark a transaction as completed.
    """

    with db_transaction.atomic():
        transaction = (
            WalletTransaction.objects
            .select_for_update()
            .get(
                id=transaction_id,
            )
        )

        if transaction.status == "completed":
            return transaction

        if transaction.status in (
            "failed",
            "cancelled",
        ):
            raise ValueError(
                "A failed or cancelled transaction "
                "cannot be completed."
            )

        transaction.status = "completed"
        transaction.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return transaction


def fail_transaction(
    transaction_id,
    reason: str | None = None,
):
    """
    Mark a transaction as failed.
    """

    with db_transaction.atomic():
        transaction = (
            WalletTransaction.objects
            .select_for_update()
            .get(
                id=transaction_id,
            )
        )

        if transaction.status == "completed":
            raise ValueError(
                "A completed transaction cannot be failed."
            )

        transaction.status = "failed"

        if reason:
            metadata = transaction.metadata or {}

            metadata["failure_reason"] = reason

            transaction.metadata = metadata

            transaction.save(
                update_fields=[
                    "status",
                    "metadata",
                    "updated_at",
                ]
            )

        else:
            transaction.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

        return transaction


def cancel_transaction(
    transaction_id,
    reason: str | None = None,
):
    """
    Cancel a pending transaction.
    """

    with db_transaction.atomic():
        transaction = (
            WalletTransaction.objects
            .select_for_update()
            .get(
                id=transaction_id,
            )
        )

        if transaction.status != "pending":
            raise ValueError(
                "Only pending transactions "
                "can be cancelled."
            )

        transaction.status = "cancelled"

        if reason:
            metadata = transaction.metadata or {}

            metadata["cancellation_reason"] = reason

            transaction.metadata = metadata

            transaction.save(
                update_fields=[
                    "status",
                    "metadata",
                    "updated_at",
                ]
            )

        else:
            transaction.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

        return transaction