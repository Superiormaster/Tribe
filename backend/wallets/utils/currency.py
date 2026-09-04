# wallet/utils/currency.py

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from wallets.constants import (
    CURRENCY_DECIMAL_PLACES,
    CURRENCY_SYMBOLS,
    DEFAULT_CURRENCY,
    SUPPORTED_CURRENCIES,
)
from wallets.exceptions import (
    InvalidAmountException,
    UnsupportedCurrencyException,
)


# ============================================================
# INTERNAL
# ============================================================

MONEY_QUANTIZER = Decimal("0.01")


# ============================================================
# VALIDATION
# ============================================================

def normalize_currency(currency: str | None) -> str:
    """
    Normalize a currency code.

    Example:
        ngn -> NGN
        usd -> USD
    """

    if not currency:
        return DEFAULT_CURRENCY

    return currency.strip().upper()


def is_supported_currency(
    currency: str | None,
) -> bool:
    """
    Check whether a currency is supported.
    """

    normalized = normalize_currency(currency)

    return normalized in SUPPORTED_CURRENCIES


def validate_currency(
    currency: str | None,
) -> str:
    """
    Validate and return normalized currency.
    """

    normalized = normalize_currency(currency)

    if normalized not in SUPPORTED_CURRENCIES:
        raise UnsupportedCurrencyException(
            f"Currency '{normalized}' is not supported."
        )

    return normalized


# ============================================================
# MONEY
# ============================================================

def to_decimal(
    amount,
) -> Decimal:
    """
    Safely convert a value to Decimal.

    Never use float arithmetic for financial calculations.
    """

    if amount is None:
        raise InvalidAmountException(
            "Amount is required."
        )

    try:
        if isinstance(amount, Decimal):
            return amount

        return Decimal(str(amount))

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ):
        raise InvalidAmountException(
            "The amount must be a valid number."
        )


def quantize_money(
    amount,
) -> Decimal:
    """
    Round money to two decimal places.
    """

    value = to_decimal(amount)

    return value.quantize(
        MONEY_QUANTIZER,
        rounding=ROUND_HALF_UP,
    )


def validate_positive_amount(
    amount,
) -> Decimal:
    """
    Ensure amount is greater than zero.
    """

    value = quantize_money(amount)

    if value <= Decimal("0.00"):
        raise InvalidAmountException(
            "Amount must be greater than zero."
        )

    return value


# ============================================================
# CURRENCY SYMBOL
# ============================================================

def get_currency_symbol(
    currency: str | None,
) -> str:
    """
    Return the display symbol for a currency.
    """

    normalized = validate_currency(currency)

    return CURRENCY_SYMBOLS.get(
        normalized,
        normalized,
    )


# ============================================================
# FORMATTING
# ============================================================

def format_money(
    amount,
    currency: str = DEFAULT_CURRENCY,
    include_symbol: bool = True,
) -> str:
    """
    Format a monetary value for display.

    Example:
        format_money(50000, "NGN")
        -> ₦50,000.00
    """

    normalized_currency = validate_currency(
        currency
    )

    value = quantize_money(amount)

    decimal_places = CURRENCY_DECIMAL_PLACES.get(
        normalized_currency,
        2,
    )

    formatted = f"{value:,.{decimal_places}f}"

    if not include_symbol:
        return formatted

    symbol = get_currency_symbol(
        normalized_currency
    )

    return f"{symbol}{formatted}"