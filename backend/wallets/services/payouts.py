# wallet/services/payouts.py

from django.db import transaction
from django.utils import timezone

from wallets.models import (
    Payout,
    Withdrawal,
)

from wallets.services.withdrawals import (
    mark_withdrawal_processing,
    mark_withdrawal_completed,
    mark_withdrawal_failed,
)

from wallets.utils.reference import (
    generate_payout_reference,
)


class PayoutError(Exception):
    """Base payout service error."""


@transaction.atomic
def create_payout(
    withdrawal_id,
):
    """
    Create a payout record for a withdrawal.

    The actual Paystack/provider API call should happen
    outside this database transaction.

    This service only creates the internal payout record.
    """

    withdrawal = (
        Withdrawal.objects
        .select_for_update()
        .select_related("wallet")
        .get(
            id=withdrawal_id,
        )
    )

    if withdrawal.status != "pending":
        raise PayoutError(
            "Only pending withdrawals can create payouts."
        )

    existing = Payout.objects.filter(
        withdrawal=withdrawal,
    ).first()

    if existing:
        return existing

    payout = Payout.objects.create(
        wallet=withdrawal.wallet,
        withdrawal=withdrawal,
        amount=withdrawal.amount,
        currency=withdrawal.currency,
        status="pending",
        provider_reference="",
    )

    return payout


@transaction.atomic
def mark_payout_processing(
    payout_id,
):
    """
    Mark internal payout as processing.
    """

    payout = (
        Payout.objects
        .select_for_update()
        .select_related("withdrawal")
        .get(
            id=payout_id,
        )
    )

    if payout.status == "processing":
        return payout

    if payout.status != "pending":
        raise PayoutError(
            "Only pending payouts can be processed."
        )

    payout.status = "processing"

    payout.save(
        update_fields=[
            "status",
        ]
    )

    withdrawal = payout.withdrawal

    if withdrawal.status == "pending":
        mark_withdrawal_processing(
            withdrawal.id
        )

    return payout


@transaction.atomic
def complete_payout(
    payout_id,
    provider_reference,
):
    """
    Mark payout as completed.

    provider_reference should be the reference returned
    by Paystack or another payout provider.
    """

    payout = (
        Payout.objects
        .select_for_update()
        .select_related("withdrawal")
        .get(
            id=payout_id,
        )
    )

    if payout.status == "completed":
        return payout

    if payout.status != "processing":
        raise PayoutError(
            "Only processing payouts can be completed."
        )

    payout.status = "completed"
    payout.provider_reference = provider_reference
    payout.completed_at = timezone.now()

    payout.save(
        update_fields=[
            "status",
            "provider_reference",
            "completed_at",
        ]
    )

    mark_withdrawal_completed(
        payout.withdrawal_id
    )

    return payout


@transaction.atomic
def fail_payout(
    payout_id,
    reason,
):
    """
    Mark payout as failed.

    The withdrawal is also failed and its reserved
    wallet funds are returned.
    """

    payout = (
        Payout.objects
        .select_for_update()
        .select_related("withdrawal")
        .get(
            id=payout_id,
        )
    )

    if payout.status == "completed":
        raise PayoutError(
            "A completed payout cannot be failed."
        )

    payout.status = "failed"

    payout.save(
        update_fields=[
            "status",
        ]
    )

    mark_withdrawal_failed(
        payout.withdrawal_id,
        reason,
    )

    return payout