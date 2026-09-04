# wallet/services/withdrawals.py

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from wallets.models import (
    Wallet,
    Withdrawal,
    WalletTransaction,
    BankAccount,
)

from wallets.services.transactions import (
    create_transaction,
)

from wallets.utils.currency import (
    validate_positive_amount,
    quantize_money,
)

from wallets.utils.reference import (
    generate_withdrawal_reference,
)


class WithdrawalError(Exception):
    """Base withdrawal service error."""


class InsufficientBalanceError(WithdrawalError):
    """Raised when the wallet does not have enough available funds."""


class InvalidBankAccountError(WithdrawalError):
    """Raised when the payout bank account is invalid."""


class WithdrawalAlreadyExistsError(WithdrawalError):
    """Raised when a duplicate withdrawal is detected."""


@transaction.atomic
def create_withdrawal(
    user,
    amount,
    bank_account_id,
    *,
    metadata=None,
):
    """
    Create a withdrawal request.

    Flow:

        User
          ↓
        Bank account validation
          ↓
        Lock wallet
          ↓
        Check available balance
          ↓
        Deduct available balance
          ↓
        Create Withdrawal
          ↓
        Create WalletTransaction
          ↓
        Commit
    """

    amount = validate_positive_amount(amount)

    metadata = metadata or {}

    # --------------------------------------------------------
    # BANK ACCOUNT
    # --------------------------------------------------------

    try:
        bank_account = BankAccount.objects.get(
            id=bank_account_id,
            user=user,
        )
    except BankAccount.DoesNotExist:
        raise InvalidBankAccountError(
            "The selected bank account does not exist."
        )

    if not bank_account.is_verified:
        raise InvalidBankAccountError(
            "The selected bank account has not been verified."
        )

    # --------------------------------------------------------
    # WALLET LOCK
    # --------------------------------------------------------

    wallet = (
        Wallet.objects
        .select_for_update()
        .get(
            user=user,
        )
    )

    # --------------------------------------------------------
    # BALANCE CHECK
    # --------------------------------------------------------

    if wallet.available_balance < amount:
        raise InsufficientBalanceError(
            "Insufficient available balance."
        )

    # --------------------------------------------------------
    # CREATE WITHDRAWAL
    # --------------------------------------------------------

    reference = generate_withdrawal_reference()

    withdrawal = Withdrawal.objects.create(
        wallet=wallet,
        amount=amount,
        currency=wallet.currency,
        status="pending",
        reference=reference,
        bank_account=bank_account,
    )

    # --------------------------------------------------------
    # RESERVE MONEY
    # --------------------------------------------------------

    wallet.available_balance = quantize_money(
        wallet.available_balance - amount
    )

    wallet.save(
        update_fields=[
            "available_balance",
            "updated_at",
        ]
    )

    # --------------------------------------------------------
    # LEDGER
    # --------------------------------------------------------

    wallet_transaction = create_transaction(
        wallet=wallet,
        transaction_type="withdrawal",
        amount=amount,
        description="Withdrawal request",
        status="pending",
        currency=wallet.currency,
        withdrawal=withdrawal,
        metadata=metadata,
    )

    return {
        "withdrawal": withdrawal,
        "transaction": wallet_transaction,
        "wallet": wallet,
    }


@transaction.atomic
def cancel_withdrawal(
    withdrawal_id,
    user,
    reason=None,
):
    """
    Cancel a pending withdrawal.

    Since the amount was already reserved from available_balance,
    cancellation returns it to the wallet.
    """

    withdrawal = (
        Withdrawal.objects
        .select_for_update()
        .select_related("wallet")
        .get(
            id=withdrawal_id,
            wallet__user=user,
        )
    )

    if withdrawal.status != "pending":
        raise WithdrawalError(
            "Only pending withdrawals can be cancelled."
        )

    wallet = (
        Wallet.objects
        .select_for_update()
        .get(
            id=withdrawal.wallet_id,
        )
    )

    # Return reserved funds.
    wallet.available_balance = quantize_money(
        wallet.available_balance
        + withdrawal.amount
    )

    wallet.save(
        update_fields=[
            "available_balance",
            "updated_at",
        ]
    )

    withdrawal.status = "cancelled"

    if reason:
        withdrawal.failure_reason = reason

    withdrawal.save(
        update_fields=[
            "status",
            "failure_reason",
            "updated_at",
        ]
    )

    # Update ledger.
    WalletTransaction.objects.filter(
        withdrawal=withdrawal,
        status="pending",
    ).update(
        status="cancelled",
        metadata={
            "cancellation_reason": reason
        }
        if reason
        else {},
    )

    return withdrawal


@transaction.atomic
def mark_withdrawal_processing(
    withdrawal_id,
):
    """
    Mark a withdrawal as being processed by the payout provider.
    """

    withdrawal = (
        Withdrawal.objects
        .select_for_update()
        .get(
            id=withdrawal_id,
        )
    )

    if withdrawal.status != "pending":
        raise WithdrawalError(
            "Only pending withdrawals can be processed."
        )

    withdrawal.status = "processing"

    withdrawal.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    WalletTransaction.objects.filter(
        withdrawal=withdrawal,
        status="pending",
    ).update(
        status="pending",
    )

    return withdrawal


@transaction.atomic
def mark_withdrawal_completed(
    withdrawal_id,
):
    """
    Mark withdrawal as successfully completed.

    The money was already removed from available_balance
    when the withdrawal was created.
    """

    withdrawal = (
        Withdrawal.objects
        .select_for_update()
        .get(
            id=withdrawal_id,
        )
    )

    if withdrawal.status == "completed":
        return withdrawal

    if withdrawal.status != "processing":
        raise WithdrawalError(
            "Only processing withdrawals can be completed."
        )

    wallet = (
        Wallet.objects
        .select_for_update()
        .get(
            id=withdrawal.wallet_id,
        )
    )

    withdrawal.status = "completed"

    withdrawal.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    wallet.lifetime_withdrawn = quantize_money(
        wallet.lifetime_withdrawn
        + withdrawal.amount
    )

    wallet.save(
        update_fields=[
            "lifetime_withdrawn",
            "updated_at",
        ]
    )

    WalletTransaction.objects.filter(
        withdrawal=withdrawal,
    ).update(
        status="completed",
    )

    return withdrawal


@transaction.atomic
def mark_withdrawal_failed(
    withdrawal_id,
    reason,
):
    """
    Mark withdrawal as failed and return the reserved
    funds to available_balance.
    """

    withdrawal = (
        Withdrawal.objects
        .select_for_update()
        .get(
            id=withdrawal_id,
        )
    )

    if withdrawal.status in (
        "completed",
        "cancelled",
    ):
        raise WithdrawalError(
            "This withdrawal can no longer be failed."
        )

    wallet = (
        Wallet.objects
        .select_for_update()
        .get(
            id=withdrawal.wallet_id,
        )
    )

    # Return reserved money.
    wallet.available_balance = quantize_money(
        wallet.available_balance
        + withdrawal.amount
    )

    wallet.save(
        update_fields=[
            "available_balance",
            "updated_at",
        ]
    )

    withdrawal.status = "failed"
    withdrawal.failure_reason = reason

    withdrawal.save(
        update_fields=[
            "status",
            "failure_reason",
            "updated_at",
        ]
    )

    WalletTransaction.objects.filter(
        withdrawal=withdrawal,
    ).update(
        status="failed",
        metadata={
            "failure_reason": reason,
        },
    )

    return withdrawal