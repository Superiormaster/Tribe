from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    VerifyEmailView,
    ForgotPasswordView,
    ResetPasswordView,
    profile_view,
    profile_posts,
    ProfileView,
    connected_users,
    connect_user,
    heartbeat,
    remove_connection,
    cancel_connection,
    PublicProfileView,
    save_interests,
    discover_creators,
    discover_people,
    ProtectedView,
    GoogleLoginView,
    RefreshView,
    StarViewSet,
    get_starred_users,
    decline_connection,
    accept_connection,
    pending_requests,
    sent_requests,
    complete_onboarding,
    discover_connect,
    socket_auth,
    onboarding_status,
    set_online,
    set_offline,
    get_presence,
    RevokeSessionView,
    DeviceListView,

    # Multi-account
    NormalLoginView,
    MultiAccountLogoutView,
)

router = DefaultRouter()
router.register(r'star', StarViewSet, basename='star')

urlpatterns = [
    # -----------------------------
    # AUTH (MULTI ACCOUNT)
    # -----------------------------
    path("login/", NormalLoginView.as_view(), name="login"),
    path("logout/", MultiAccountLogoutView.as_view(), name="logout"),
    path("socket-auth/", socket_auth),

    # -----------------------------
    # GOOGLE LOGIN
    # -----------------------------
    path("google-login/", GoogleLoginView.as_view(), name="google-login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("revoke/", RevokeSessionView.as_view(), name="revoke"),
    path("device/", DeviceListView.as_view(), name="device"),

    # -----------------------------
    # REGISTER & EMAIL
    # -----------------------------
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),

    # -----------------------------
    # PASSWORD RESET
    # -----------------------------
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset_password"),

    # -----------------------------
    # PROFILE
    # -----------------------------
    path("me/", ProfileView.as_view(), name="current-user-profile"),
    path("profile/<str:username>/", profile_view),
    path("profile/<str:username>/posts/", profile_posts),
    path("save-interests/", save_interests),

    # -----------------------------
    # PRESENCE (ONLINE / LAST SEEN)
    # -----------------------------
    path("presence/online/", set_online),
    path("presence/offline/", set_offline),
    path("presence/<int:user_id>/", get_presence),
    path("presence/heartbeat/", heartbeat),

    # -----------------------------
    # DISCOVERY & DEBUG
    # -----------------------------
    path("pending-requests/", pending_requests),
    path("sent-requests/", sent_requests),
    path("accept/<int:user_id>/", accept_connection),
    path("decline/<int:user_id>/", decline_connection),
    path("connect/<int:user_id>/", connect_user),
    path("remove/<int:user_id>/", remove_connection),
    path("cancel/<int:user_id>/", cancel_connection),
    path("discover-creators/", discover_creators),
    path("connected/", connected_users),
    path("discover-people/", discover_people),
    path("complete-onboarding/", complete_onboarding),
    path('onboarding-status/', onboarding_status),
    path('discover-connect/', discover_connect),
    path("starred/", get_starred_users),

    # -----------------------------
    # PROTECTED
    # -----------------------------
    path("protected/", ProtectedView.as_view(), name="protected"),
]

# Add DRF router URLs
urlpatterns += router.urls

urlpatterns += [
    path("<str:username>/", PublicProfileView.as_view()),
]