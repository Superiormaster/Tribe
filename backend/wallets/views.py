from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Wallet, Transaction
from .serializers import WalletSerializer, TransactionSerializer
from django.shortcuts import get_object_or_404

class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(wallet__user=self.request.user)

    @action(detail=False, methods=['post'])
    def tip(self, request):
        """
        Tip another user
        POST data: {"receiver_id": 2, "amount": 50}
        """
        receiver_id = request.data.get('receiver_id')
        amount = float(request.data.get('amount', 0))
        if amount <= 0:
            return Response({"error": "Amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)

        # Get wallets
        sender_wallet, _ = Wallet.objects.get_or_create(user=request.user)
        receiver_wallet, _ = Wallet.objects.get_or_create(user_id=receiver_id)

        if sender_wallet.balance < amount:
            return Response({"error": "Insufficient balance"}, status=status.HTTP_400_BAD_REQUEST)

        # Deduct from sender, add to receiver
        sender_wallet.balance -= amount
        sender_wallet.save()

        receiver_wallet.balance += amount
        receiver_wallet.save()

        # Create transaction records
        Transaction.objects.create(wallet=sender_wallet, amount=-amount, transaction_type='tip')
        Transaction.objects.create(wallet=receiver_wallet, amount=amount, transaction_type='tip')

        return Response({"status": f"Sent {amount} to user {receiver_id}"})
