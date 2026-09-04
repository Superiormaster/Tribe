# wallet/utils/calculations.py

from decimal import Decimal

from wallets.constants import ZERO
from wallets.utils.currency import quantize_money


# ============================================================
# TOTAL
# ============================================================

def calculate_total(
    *amounts,
) -> Decimal:
    """
    Safely calculate the total of multiple monetary values.

    Example:
        calculate_total(100, 200, 300)
        -> Decimal("600.00")
    """

    total = ZERO

    for amount in amounts:
        if amount is None:
            continue

        total += Decimal(str(amount))

    return quantize_money(total)


# ============================================================
# PERCENTAGE
# ============================================================

def calculate_percentage(
    value,
    total,
    decimal_places: int = 2,
) -> Decimal:
    """
    Calculate value as a percentage of total.

    Example:
        25 / 100 -> 25.00
    """

    value = Decimal(str(value or 0))
    total = Decimal(str(total or 0))

    if total == ZERO:
        return ZERO

    percentage = (
        value / total
    ) * Decimal("100")

    quantizer = Decimal(
        "1." + ("0" * decimal_places)
    )

    return percentage.quantize(
        quantizer
    )


# ============================================================
# GROWTH
# ============================================================

def calculate_growth(
    current,
    previous,
    decimal_places: int = 2,
) -> Decimal:
    """
    Calculate percentage growth between two values.

    Example:
        current = 120
        previous = 100

        -> 20%
    """

    current = Decimal(str(current or 0))
    previous = Decimal(str(previous or 0))

    if previous == ZERO:
        if current > ZERO:
            return Decimal("100.00")

        return ZERO

    growth = (
        (current - previous)
        / previous
    ) * Decimal("100")

    quantizer = Decimal(
        "1." + ("0" * decimal_places)
    )

    return growth.quantize(
        quantizer
    )


# ============================================================
# GOAL PROGRESS
# ============================================================

def calculate_goal_progress(
    current_amount,
    target_amount,
    decimal_places: int = 2,
) -> Decimal:
    """
    Calculate monetization goal progress.

    Progress is capped at 100%.
    """

    current = Decimal(
        str(current_amount or 0)
    )

    target = Decimal(
        str(target_amount or 0)
    )

    if target <= ZERO:
        return ZERO

    progress = (
        current / target
    ) * Decimal("100")

    progress = min(
        progress,
        Decimal("100"),
    )

    quantizer = Decimal(
        "1." + ("0" * decimal_places)
    )

    return progress.quantize(
        quantizer
    )


# ============================================================
# REVENUE SHARE
# ============================================================

def calculate_revenue_share(
    amount,
    share,
) -> Decimal:
    """
    Calculate a creator/platform revenue share.

    share should be represented as:
        0.70 = 70%
        0.90 = 90%
    """

    amount = Decimal(
        str(amount or 0)
    )

    share = Decimal(
        str(share or 0)
    )

    if amount <= ZERO:
        return ZERO

    if share < ZERO:
        share = ZERO

    if share > Decimal("1"):
        share = Decimal("1")

    return quantize_money(
        amount * share
    )