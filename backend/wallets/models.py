# wallets/models.py
from django.db import models
from django.conf import settings

class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    balance = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.user.username} Wallet: {self.balance}"


class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('tip', 'Tip'),
        ('subscription', 'Subscription'),
        ('payout', 'Payout'),
    )

    wallet = models.ForeignKey(Wallet, related_name='transactions', on_delete=models.CASCADE)
    amount = models.FloatField()
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.wallet.user.username} - {self.transaction_type} - {self.amount}"