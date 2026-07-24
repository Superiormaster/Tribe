from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CommunityViewSet, TribeViewSet, PublicTribeViewSet, invite_users, send_community_invite, accept_community_invite, decline_community_invite, mute_community_user, unmute_community_user, ban_community_user, unban_community_user, remove_community_user, tribe_requests, tribe_request_detail, get_my_invites, SuggestedCommunityView, joined_communities

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
        "tribe-requests/",
        tribe_requests,
        name="tribe-requests",
    ),

    path(
        "joined-communities/",
        joined_communities,
        name="joined-communities",
    ),
  
    path(
        "tribe-requests/<int:pk>/",
        tribe_request_detail,
        name="tribe-request-detail",
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
  
    path(
        "communities/<int:community_id>/mute/",
        mute_community_user,
    ),
    path(
        "communities/<int:community_id>/unmute/",
        unmute_community_user,
    ),
    path(
        "communities/<int:community_id>/ban/",
        ban_community_user,
    ),
    path(
        "communities/<int:community_id>/unban/",
        unban_community_user,
    ),
    path(
        "communities/<int:community_id>/remove-user/",
        remove_community_user,
    ),
    path(
        "communities/<int:community_id>/suggested/",
        SuggestedCommunityView.as_view(),
    ),

    # OPTIONAL admin route
    path('admin/tribes/', TribeViewSet.as_view({'get': 'list', 'post': 'create'})),
]

urlpatterns += router.urls