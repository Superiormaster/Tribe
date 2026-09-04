# wallet/views/wallet.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wallets.services.wallet import (
    get_or_create_wallet,
)

from wallets.serializers import (
    WalletSerializer,
)


class WalletView(APIView):
    """
    Return the authenticated user's wallet.
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):

        wallet = get_or_create_wallet(
            request.user
        )

        serializer = WalletSerializer(
            wallet
        )

        return Response(
            serializer.data
        )