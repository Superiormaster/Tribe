# wallet/serializers.py

from rest_framework import serializers

from .models import (
    Wallet,
    WalletTransaction,
    Revenue,
    Withdrawal,
    BankAccount,
    Payout,
    AudienceReward,
    MonetizationGoal,
)
from decimal import Decimal

class WalletSerializer(serializers.ModelSerializer):
    """
    Serializer for the creator wallet.
    """

    user_id = serializers.IntegerField(
        source="user.id",
        read_only=True,
    )

    class Meta:
        model = Wallet

        fields = [
            "id",
            "user_id",
            "currency",
            "available_balance",
            "pending_balance",
            "lifetime_earnings",
            "lifetime_withdrawn",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "user_id",
            "available_balance",
            "pending_balance",
            "lifetime_earnings",
            "lifetime_withdrawn",
            "created_at",
            "updated_at",
        ]


# ============================================================
# WALLET TRANSACTIONS
# ============================================================


class WalletTransactionSerializer(
    serializers.ModelSerializer
):
    """
    Serializer for wallet ledger transactions.
    """

    transaction_type_display = (
        serializers.CharField(
            source="get_transaction_type_display",
            read_only=True,
        )
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = WalletTransaction

        fields = [
            "id",
            "transaction_type",
            "transaction_type_display",
            "status",
            "status_display",
            "amount",
            "currency",
            "description",
            "reference",
            "metadata",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


# ============================================================
# REVENUE
# ============================================================


class RevenueSerializer(
    serializers.ModelSerializer
):
    """
    Individual revenue record.
    """

    source_display = serializers.CharField(
        source="get_source_display",
        read_only=True,
    )

    class Meta:
        model = Revenue

        fields = [
            "id",
            "source",
            "source_display",
            "amount",
            "currency",
            "content_type",
            "content_id",
            "metadata",
            "created_at",
        ]

        read_only_fields = fields


# ============================================================
# BANK ACCOUNT
# ============================================================


class BankAccountSerializer(
    serializers.ModelSerializer
):
    """
    Bank account serializer.

    Never expose unnecessary sensitive information.
    """

    masked_account_number = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = BankAccount

        fields = [
            "id",
            "bank_name",
            "account_name",
            "account_number",
            "masked_account_number",
            "bank_code",
            "is_verified",
            "is_default",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "masked_account_number",
            "is_verified",
            "created_at",
        ]

    def get_masked_account_number(
        self,
        obj,
    ):
        account_number = (
            obj.account_number or ""
        )

        if len(account_number) <= 4:
            return account_number

        return (
            "****"
            + account_number[-4:]
        )


# ============================================================
# WITHDRAWAL
# ============================================================


class WithdrawalSerializer(
    serializers.ModelSerializer
):
    """
    Withdrawal request serializer.
    """

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    bank_account = BankAccountSerializer(
        read_only=True
    )

    class Meta:
        model = Withdrawal

        fields = [
            "id",
            "amount",
            "currency",
            "status",
            "status_display",
            "reference",
            "bank_account",
            "failure_reason",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields


# ============================================================
# WITHDRAWAL CREATE
# ============================================================


class WithdrawalCreateSerializer(
    serializers.Serializer
):
    """
    Input serializer for creating a withdrawal.

    Example:

    {
        "amount": "50000.00",
        "bank_account_id": 12
    }
    """

    amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    bank_account_id = serializers.IntegerField(
        min_value=1
    )


# ============================================================
# PAYOUT
# ============================================================


class PayoutSerializer(
    serializers.ModelSerializer
):
    """
    Payout history serializer.
    """

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    withdrawal_reference = (
        serializers.CharField(
            source="withdrawal.reference",
            read_only=True,
        )
    )

    class Meta:
        model = Payout

        fields = [
            "id",
            "amount",
            "currency",
            "status",
            "status_display",
            "provider_reference",
            "withdrawal_reference",
            "created_at",
            "completed_at",
        ]

        read_only_fields = fields


# ============================================================
# AUDIENCE REWARDS
# ============================================================


class AudienceRewardSerializer(
    serializers.ModelSerializer
):
    """
    Audience reward serializer.
    """

    status = serializers.SerializerMethodField()

    class Meta:
        model = AudienceReward

        fields = [
            "id",
            "name",
            "description",
            "amount",
            "currency",
            "is_claimed",
            "status",
            "created_at",
            "claimed_at",
        ]

        read_only_fields = fields

    def get_status(
        self,
        obj,
    ):
        if obj.is_claimed:
            return "claimed"

        return "available"


# ============================================================
# MONETIZATION GOALS
# ============================================================


class MonetizationGoalSerializer(
    serializers.ModelSerializer
):
    """
    Creator monetization goal.
    """

    progress_percentage = (
        serializers.SerializerMethodField()
    )

    remaining_amount = (
        serializers.SerializerMethodField()
    )

    is_completed = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = MonetizationGoal

        fields = [
            "id",
            "title",
            "target_amount",
            "current_amount",
            "remaining_amount",
            "progress_percentage",
            "currency",
            "is_active",
            "is_completed",
            "created_at",
            "completed_at",
        ]

        read_only_fields = [
            "id",
            "current_amount",
            "remaining_amount",
            "progress_percentage",
            "is_completed",
            "created_at",
            "completed_at",
        ]

    def get_progress_percentage(
        self,
        obj,
    ):
        if obj.target_amount <= 0:
            return 0

        percentage = (
            obj.current_amount
            / obj.target_amount
        ) * 100

        return min(
            float(percentage),
            100,
        )

    def get_remaining_amount(
        self,
        obj,
    ):
        remaining = (
            obj.target_amount
            - obj.current_amount
        )

        return max(
            remaining,
            0,
        )

    def get_is_completed(
        self,
        obj,
    ):
        return (
            obj.current_amount
            >= obj.target_amount
        )


# ============================================================
# REVENUE SOURCE
# ============================================================


class RevenueSourceSerializer(
    serializers.Serializer
):
    """
    Aggregated revenue source.

    Used by:

        <RevenueSources />
    """

    id = serializers.CharField()

    name = serializers.CharField()

    source = serializers.CharField()

    amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    percentage = serializers.FloatField()

    currency = serializers.CharField(
        max_length=3
    )

    transaction_count = serializers.IntegerField(
        default=0
    )


# ============================================================
# REVENUE CHART
# ============================================================


class RevenueChartPointSerializer(
    serializers.Serializer
):
    """
    Single point in the revenue chart.
    """

    date = serializers.DateField()

    amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    currency = serializers.CharField(
        max_length=3
    )


# ============================================================
# MONETIZATION STATS
# ============================================================


class MonetizationStatsSerializer(
    serializers.Serializer
):
    """
    Statistics displayed by MonetizationStats.
    """

    total_earnings = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    previous_period_earnings = (
        serializers.DecimalField(
            max_digits=18,
            decimal_places=2,
        )
    )

    growth_percentage = (
        serializers.FloatField()
    )

    total_revenue = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    average_daily_earnings = (
        serializers.DecimalField(
            max_digits=18,
            decimal_places=2,
        )
    )

    transaction_count = (
        serializers.IntegerField()
    )

    completed_transactions = (
        serializers.IntegerField()
    )

    pending_transactions = (
        serializers.IntegerField()
    )


# ============================================================
# EARNINGS OVERVIEW
# ============================================================


class EarningsOverviewSerializer(
    serializers.Serializer
):
    """
    Main earnings summary.
    """

    total_earnings = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    available_balance = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    pending_balance = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    withdrawn_amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    currency = serializers.CharField(
        max_length=3
    )

    period_label = serializers.CharField()

    previous_period_earnings = (
        serializers.DecimalField(
            max_digits=18,
            decimal_places=2,
        )
    )

    completed_transactions = (
        serializers.IntegerField()
    )

    pending_transactions = (
        serializers.IntegerField()
    )


# ============================================================
# TOP CONTENT
# ============================================================


class TopContentSerializer(
    serializers.Serializer
):
    """
    Content responsible for the creator's
    highest monetization performance.
    """

    id = serializers.CharField()

    title = serializers.CharField(
        allow_blank=True
    )

    content_type = serializers.CharField()

    earnings = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    views = serializers.IntegerField(
        default=0
    )

    likes = serializers.IntegerField(
        default=0
    )

    comments = serializers.IntegerField(
        default=0
    )

    currency = serializers.CharField(
        max_length=3
    )


# ============================================================
# INSIGHT
# ============================================================


class MonetizationInsightSerializer(
    serializers.Serializer
):
    """
    Creator monetization insight.
    """

    id = serializers.CharField()

    type = serializers.CharField()

    title = serializers.CharField()

    description = serializers.CharField()

    value = serializers.CharField(
        allow_blank=True,
        required=False,
    )

    trend = serializers.CharField(
        allow_blank=True,
        required=False,
    )

    percentage = serializers.FloatField(
        required=False,
        allow_null=True,
    )

    severity = serializers.CharField(
        required=False,
        allow_blank=True,
    )


# ============================================================
# DASHBOARD
# ============================================================


class MonetizationDashboardSerializer(
    serializers.Serializer
):
    """
    Complete monetization dashboard response.

    This is the main serializer contract between
    Django and the Tribe monetization page.
    """

    currency = serializers.CharField(
        max_length=3
    )

    available_balance = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    pending_balance = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    total_earnings = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    withdrawn_amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    period_label = serializers.CharField()

    previous_period_earnings = (
        serializers.DecimalField(
            max_digits=18,
            decimal_places=2,
        )
    )

    completed_transactions = (
        serializers.IntegerField()
    )

    pending_transactions = (
        serializers.IntegerField()
    )

    earnings = EarningsOverviewSerializer()

    stats = MonetizationStatsSerializer()

    revenue_chart = (
        RevenueChartPointSerializer(
            many=True
        )
    )

    revenue_sources = (
        RevenueSourceSerializer(
            many=True
        )
    )

    top_content = TopContentSerializer(
        many=True
    )

    audience_rewards = (
        AudienceRewardSerializer(
            many=True
        )
    )

    transactions = (
        WalletTransactionSerializer(
            many=True
        )
    )

    payouts = PayoutSerializer(
        many=True
    )

    goal = MonetizationGoalSerializer(
        allow_null=True
    )

    insights = (
        MonetizationInsightSerializer(
            many=True
        )
    )