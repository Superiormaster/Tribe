# wallet/views/withdrawals.py

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wallets.services.withdrawals import (
    create_withdrawal,
    WithdrawalError,
    InsufficientBalanceError,
    InvalidBankAccountError,
)

from wallets.serializers import (
    WithdrawalSerializer,
)


class WithdrawalCreateView(APIView):
    """
    Create a withdrawal request.

    POST /withdraw/

    Expected body:

    {
        "amount": 50000,
        "bank_account_id": 12
    }
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def post(self, request):

        amount = request.data.get(
            "amount"
        )

        bank_account_id = request.data.get(
            "bank_account_id"
        )

        if amount is None:
            return Response(
                {
                    "detail": "Amount is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if bank_account_id is None:
            return Response(
                {
                    "detail": (
                        "Bank account is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            result = create_withdrawal(
                user=request.user,
                amount=amount,
                bank_account_id=bank_account_id,
                metadata={
                    "ip_address": (
                        request.META.get(
                            "REMOTE_ADDR"
                        )
                    ),
                    "user_agent": (
                        request.META.get(
                            "HTTP_USER_AGENT",
                            "",
                        )[:500]
                    ),
                },
            )

        except InsufficientBalanceError as exc:

            return Response(
                {
                    "detail": str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except InvalidBankAccountError as exc:

            return Response(
                {
                    "detail": str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except WithdrawalError as exc:

            return Response(
                {
                    "detail": str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:

            return Response(
                {
                    "detail": (
                        "Unable to create withdrawal "
                        "request."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = WithdrawalSerializer(
            result["withdrawal"]
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )