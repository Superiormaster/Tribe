# wallet/utils/reference.py

import secrets
import string

from wallets.constants import (
    PAYOUT_REFERENCE_PREFIX,
    REFERENCE_MAX_LENGTH,
    REVENUE_REFERENCE_PREFIX,
    REWARD_REFERENCE_PREFIX,
    TRANSACTION_REFERENCE_PREFIX,
    WALLET_REFERENCE_PREFIX,
    WITHDRAWAL_REFERENCE_PREFIX,
)

REFERENCE_ALPHABET = (
    string.ascii_uppercase
    + string.digits
)


def _generate_reference(
    prefix: str,
    length: int = 16,
) -> str:
    """
    Generate a secure financial reference.

    Example:
        TXN-7K2P9Q4M8X1D5R3T
    """

    token = "".join(
        secrets.choice(
            REFERENCE_ALPHABET
        )
        for _ in range(length)
    )

    reference = f"{prefix}-{token}"

    if len(reference) > REFERENCE_MAX_LENGTH:
        raise ValueError(
            "Generated reference exceeds maximum length."
        )

    return reference

def generate_wallet_reference() -> str:
    return _generate_reference(
        WALLET_REFERENCE_PREFIX
    )

def generate_transaction_reference() -> str:
    return _generate_reference(
        TRANSACTION_REFERENCE_PREFIX
    )

def generate_revenue_reference() -> str:
    return _generate_reference(
        REVENUE_REFERENCE_PREFIX
    )

def generate_withdrawal_reference() -> str:
    return _generate_reference(
        WITHDRAWAL_REFERENCE_PREFIX
    )

def generate_payout_reference() -> str:
    return _generate_reference(
        PAYOUT_REFERENCE_PREFIX
    )

def generate_reward_reference() -> str:
    return _generate_reference(
        REWARD_REFERENCE_PREFIX
    )