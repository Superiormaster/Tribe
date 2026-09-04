# wallet/exceptions.py

from rest_framework import status
from rest_framework.exceptions import APIException


# ============================================================
# BASE WALLET EXCEPTION
# ============================================================

class WalletException(APIException):
    """
    Base exception for wallet-related errors.
    """

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A wallet operation could not be completed."
    default_code = "wallet_error"


# ============================================================
# WALLET
# ============================================================

class WalletNotFoundException(WalletException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Wallet not found."
    default_code = "wallet_not_found"


class WalletInactiveException(WalletException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "This wallet is currently unavailable."
    default_code = "wallet_inactive"


# ============================================================
# BALANCE
# ============================================================

class InsufficientBalanceException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Insufficient available balance."
    default_code = "insufficient_balance"


class InvalidAmountException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The amount provided is invalid."
    default_code = "invalid_amount"


class MinimumWithdrawalException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The withdrawal amount is below the minimum allowed amount."
    default_code = "minimum_withdrawal"


class MaximumWithdrawalException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The withdrawal amount exceeds the maximum allowed amount."
    default_code = "maximum_withdrawal"


# ============================================================
# BANK ACCOUNT
# ============================================================

class BankAccountNotFoundException(WalletException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Bank account not found."
    default_code = "bank_account_not_found"


class BankAccountNotVerifiedException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The bank account must be verified before making a withdrawal."
    default_code = "bank_account_not_verified"


class BankAccountInactiveException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This bank account is inactive."
    default_code = "bank_account_inactive"


class BankAccountOwnershipException(WalletException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You cannot use this bank account."
    default_code = "bank_account_ownership"


# ============================================================
# TRANSACTIONS
# ============================================================

class TransactionNotFoundException(WalletException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Transaction not found."
    default_code = "transaction_not_found"


class TransactionAlreadyProcessedException(WalletException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This transaction has already been processed."
    default_code = "transaction_already_processed"


class InvalidTransactionStatusException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The transaction is not in a valid state for this operation."
    default_code = "invalid_transaction_status"


# ============================================================
# REVENUE
# ============================================================

class RevenueNotFoundException(WalletException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Revenue record not found."
    default_code = "revenue_not_found"


class RevenueAlreadyProcessedException(WalletException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This revenue has already been processed."
    default_code = "revenue_already_processed"


class InvalidRevenueStatusException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The revenue record cannot be processed in its current state."
    default_code = "invalid_revenue_status"


# ============================================================
# WITHDRAWALS
# ============================================================

class WithdrawalNotFoundException(WalletException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Withdrawal not found."
    default_code = "withdrawal_not_found"


class WithdrawalAlreadyProcessedException(WalletException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This withdrawal has already been processed."
    default_code = "withdrawal_already_processed"


class WithdrawalProcessingException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This withdrawal cannot be processed right now."
    default_code = "withdrawal_processing_error"


class WithdrawalLimitException(WalletException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "You have reached the withdrawal limit. Please try again later."
    default_code = "withdrawal_limit_reached"


# ============================================================
# PAYOUTS
# ============================================================

class PayoutNotFoundException(WalletException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Payout not found."
    default_code = "payout_not_found"


class PayoutAlreadyProcessedException(WalletException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This payout has already been processed."
    default_code = "payout_already_processed"


class PayoutProviderException(WalletException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "The payout provider could not process the request."
    default_code = "payout_provider_error"


# ============================================================
# REWARDS
# ============================================================

class RewardNotFoundException(WalletException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Reward not found."
    default_code = "reward_not_found"


class RewardAlreadyClaimedException(WalletException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This reward has already been claimed."
    default_code = "reward_already_claimed"


class RewardUnavailableException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This reward is not currently available."
    default_code = "reward_unavailable"


# ============================================================
# GOALS
# ============================================================

class GoalNotFoundException(WalletException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Monetization goal not found."
    default_code = "goal_not_found"


class GoalLimitException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "You have reached the maximum number of active monetization goals."
    default_code = "goal_limit_reached"


class GoalCompletedException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This monetization goal has already been completed."
    default_code = "goal_completed"


# ============================================================
# CURRENCY
# ============================================================

class UnsupportedCurrencyException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This currency is not supported."
    default_code = "unsupported_currency"


class CurrencyMismatchException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The currency does not match the wallet currency."
    default_code = "currency_mismatch"


# ============================================================
# IDEMPOTENCY / REFERENCES
# ============================================================

class DuplicateReferenceException(WalletException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "A transaction with this reference already exists."
    default_code = "duplicate_reference"


class InvalidReferenceException(WalletException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The transaction reference is invalid."
    default_code = "invalid_reference"