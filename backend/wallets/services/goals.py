# wallet/services/goals.py

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from wallets.models import (
    MonetizationGoal,
    Wallet,
)

from wallets.utils.currency import (
    validate_positive_amount,
    quantize_money,
)


class GoalError(Exception):
    """Base monetization goal error."""


@transaction.atomic
def create_goal(
    user,
    title,
    target_amount,
    currency="NGN",
):
    """
    Create a monetization goal.
    """

    target_amount = validate_positive_amount(
        target_amount
    )

    return MonetizationGoal.objects.create(
        user=user,
        title=title,
        target_amount=target_amount,
        current_amount=Decimal("0.00"),
        currency=currency.upper(),
        is_active=True,
    )


@transaction.atomic
def update_goal_progress(
    goal_id,
    user,
    amount,
):
    """
    Add earnings/progress to a goal.

    Progress cannot exceed the target.
    """

    amount = validate_positive_amount(
        amount
    )

    goal = (
        MonetizationGoal.objects
        .select_for_update()
        .get(
            id=goal_id,
            user=user,
        )
    )

    if not goal.is_active:
        raise GoalError(
            "This goal is no longer active."
        )

    goal.current_amount = quantize_money(
        goal.current_amount + amount
    )

    if (
        goal.current_amount
        >= goal.target_amount
    ):
        goal.current_amount = (
            goal.target_amount
        )

        goal.is_active = False

        goal.completed_at = timezone.now()

    goal.save(
        update_fields=[
            "current_amount",
            "is_active",
            "completed_at",
        ]
    )

    return goal


@transaction.atomic
def set_goal_progress(
    goal_id,
    user,
    amount,
):
    """
    Explicitly set the current goal progress.

    Useful when recalculating goals from actual
    earnings rather than incrementing manually.
    """

    amount = validate_positive_amount(
        amount
    )

    goal = (
        MonetizationGoal.objects
        .select_for_update()
        .get(
            id=goal_id,
            user=user,
        )
    )

    if amount >= goal.target_amount:
        goal.current_amount = (
            goal.target_amount
        )

        goal.is_active = False

        if goal.completed_at is None:
            goal.completed_at = timezone.now()

    else:
        goal.current_amount = amount
        goal.is_active = True
        goal.completed_at = None

    goal.save(
        update_fields=[
            "current_amount",
            "is_active",
            "completed_at",
        ]
    )

    return goal


@transaction.atomic
def deactivate_goal(
    goal_id,
    user,
):
    """
    Deactivate a goal without deleting it.
    """

    goal = (
        MonetizationGoal.objects
        .select_for_update()
        .get(
            id=goal_id,
            user=user,
        )
    )

    goal.is_active = False

    goal.save(
        update_fields=[
            "is_active",
        ]
    )

    return goal