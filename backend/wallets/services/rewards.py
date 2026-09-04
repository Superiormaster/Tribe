# wallet/services/rewards.py

from django.db import transaction
from django.utils import timezone

from wallets.models import (
    AudienceReward,
    Wallet,
)

from wallets.services.earnings import (
    add_reward,
)

from wallets.utils.currency import (
    validate_positive_amount,
)


class RewardError(Exception):
    """Base reward service error."""


@transaction.atomic
def create_reward(
    user,
    name,
    amount,
    description="",
    currency="NGN",
):
    """
    Create an audience reward.
    """

    amount = validate_positive_amount(
        amount
    )

    return AudienceReward.objects.create(
        user=user,
        name=name,
        description=description,
        amount=amount,
        currency=currency.upper(),
    )


@transaction.atomic
def claim_reward(
    reward_id,
    user,
):
    """
    Claim an audience reward.

    The reward can only be claimed once.
    """

    reward = (
        AudienceReward.objects
        .select_for_update()
        .get(
            id=reward_id,
            user=user,
        )
    )

    if reward.is_claimed:
        raise RewardError(
            "This reward has already been claimed."
        )

    if reward.amount <= 0:
        raise RewardError(
            "This reward has no claimable amount."
        )

    wallet = (
        Wallet.objects
        .select_for_update()
        .get(
            user=user,
        )
    )

    wallet, wallet_transaction = add_reward(
        wallet=wallet,
        amount=reward.amount,
        description=(
            reward.name
            or "Audience reward"
        ),
        metadata={
            "reward_id": reward.id,
        },
    )

    reward.is_claimed = True
    reward.claimed_at = timezone.now()

    reward.save(
        update_fields=[
            "is_claimed",
            "claimed_at",
        ]
    )

    # Connect the ledger entry to the reward.
    wallet_transaction.reward = reward
    wallet_transaction.save(
        update_fields=[
            "reward",
            "updated_at",
        ]
    )

    return {
        "reward": reward,
        "wallet": wallet,
        "transaction": wallet_transaction,
    }


def get_claimable_rewards(
    user,
):
    """
    Return rewards that have not yet been claimed.
    """

    return (
        AudienceReward.objects
        .filter(
            user=user,
            is_claimed=False,
        )
        .order_by(
            "-created_at"
        )
    )