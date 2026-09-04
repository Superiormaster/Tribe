# wallet/permissions.py

from rest_framework.permissions import BasePermission


# ============================================================
# BASIC WALLET ACCESS
# ============================================================

class IsWalletOwner(BasePermission):
    """
    Allows authenticated users to access their own wallet.

    This permission expects the object to have either:
        - user
        - wallet.user
    """

    message = "You do not have permission to access this wallet."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        if hasattr(obj, "user"):
            return obj.user == request.user

        if hasattr(obj, "wallet"):
            return obj.wallet.user == request.user

        return False


# ============================================================
# USER OWNED OBJECTS
# ============================================================

class IsOwner(BasePermission):
    """
    Generic ownership permission.

    Works with objects containing:
        obj.user
    """

    message = "You do not have permission to access this resource."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        return (
            getattr(obj, "user_id", None)
            == request.user.id
        )


# ============================================================
# WALLET-OWNED OBJECTS
# ============================================================

class IsWalletResourceOwner(BasePermission):
    """
    For objects belonging to a wallet.

    Example:
        WalletTransaction
        Withdrawal
        Payout
    """

    message = "You do not have permission to access this wallet resource."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        wallet = getattr(
            obj,
            "wallet",
            None,
        )

        if not wallet:
            return False

        return (
            wallet.user_id
            == request.user.id
        )


# ============================================================
# BANK ACCOUNT
# ============================================================

class IsBankAccountOwner(BasePermission):
    """
    Only the owner of a bank account can access it.
    """

    message = "You do not have permission to access this bank account."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        return (
            obj.user_id
            == request.user.id
        )


# ============================================================
# REVENUE
# ============================================================

class IsRevenueOwner(BasePermission):
    """
    Creator can only view their own revenue.
    """

    message = "You do not have permission to access this revenue."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        return (
            obj.user_id
            == request.user.id
        )


# ============================================================
# REWARD
# ============================================================

class IsRewardOwner(BasePermission):
    """
    Creator can only access their own rewards.
    """

    message = "You do not have permission to access this reward."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        return (
            obj.user_id
            == request.user.id
        )


# ============================================================
# GOAL
# ============================================================

class IsGoalOwner(BasePermission):
    """
    Creator can only access their own monetization goals.
    """

    message = "You do not have permission to access this goal."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        return (
            obj.user_id
            == request.user.id
        )


# ============================================================
# ADMIN
# ============================================================

class IsWalletAdmin(BasePermission):
    """
    Administrative access to wallet operations.

    Useful for:
        - payout management
        - withdrawal review
        - manual adjustments
        - financial investigations
    """

    message = "Administrative wallet access is required."

    def has_permission(
        self,
        request,
        view,
    ):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_staff
                or request.user.is_superuser
            )
        )


# ============================================================
# ADMIN OR OWNER
# ============================================================

class IsOwnerOrWalletAdmin(BasePermission):
    """
    Allows either:
        1. Resource owner
        2. Staff/superuser
    """

    message = "You do not have permission to access this resource."

    def has_permission(
        self,
        request,
        view,
    ):
        return bool(
            request.user
            and request.user.is_authenticated
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        user = request.user

        if user.is_staff or user.is_superuser:
            return True

        if hasattr(obj, "user_id"):
            return (
                obj.user_id
                == user.id
            )

        wallet = getattr(
            obj,
            "wallet",
            None,
        )

        if wallet:
            return (
                wallet.user_id
                == user.id
            )

        return False