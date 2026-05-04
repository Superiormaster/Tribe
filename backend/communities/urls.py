from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CommunityViewSet, TribeViewSet, PublicTribeViewSet

router = DefaultRouter()
router.register(r'communities', CommunityViewSet, basename='community')
router.register(r'tribes', PublicTribeViewSet, basename='tribes')

urlpatterns = [
    path('admin/tribes/', TribeViewSet.as_view({'get': 'list', 'post': 'create'})),
]

urlpatterns += router.urls