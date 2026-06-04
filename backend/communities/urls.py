from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CommunityViewSet, TribeViewSet, PublicTribeViewSet, invite_users, send_community_invite, accept_community_invite, decline_community_invite, get_my_invites

router = DefaultRouter()
router.register(r'communities', CommunityViewSet, basename='community')
router.register(r'tribes', PublicTribeViewSet, basename='tribes')

urlpatterns = [
    # ✅ CUSTOM COMMUNITY ACTIONS FIRST
    path(
        "communities/<int:community_id>/invite-users/",
        invite_users
    ),

    path(
        "communities/<int:community_id>/send-invite/",
        send_community_invite
    ),

    path(
        "communities/<int:invite_id>/accept/",
        accept_community_invite
    ),

    path(
        "communities/<int:invite_id>/decline/",
        decline_community_invite
    ),

    path(
        "communities/invites/",
        get_my_invites
    ),

    # OPTIONAL admin route
    path('admin/tribes/', TribeViewSet.as_view({'get': 'list', 'post': 'create'})),
]

urlpatterns += router.urls