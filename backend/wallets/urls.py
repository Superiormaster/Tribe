from rest_framework.routers import DefaultRouter
from .views import WalletViewSet, TransactionViewSet

router = DefaultRouter()
router.register(r'wallets', WalletViewSet)
router.register(r'transactions', TransactionViewSet)

urlpatterns = router.urls