from django.urls import path
from .views import (
    admin_login,
    admin_me,
    get_reports,
    report_detail,
    resolve_report,
    delete_report,
    feedback_list,
    feedback_detail,
    get_users,
    get_user_detail,
    ban_user,
    unban_user,
    dashboard_stats,
    create_admin,
    list_tribe_requests,
    tribe_request_detail,
    create_tribe_from_request,
    reject_tribe_request,
    delete_tribe_request,
    admin_tribes,
    create_tribe,
    admin_tribe_detail,
    update_tribe,
    delete_tribe,
    create_community,
)

urlpatterns = [
    path('login/', admin_login),
    path('me/', admin_me),
    path('reports/', get_reports),
    path(
      "reports/<str:category>/<int:report_id>/",
      report_detail,
    ),
    path('reports/resolve/', resolve_report),
    path('reports/<int:report_id>/', delete_report),
    path('feedback/', feedback_list),
    path(
      'feedback-details/<int:feedback_id>/',
      feedback_detail
    ),
    path('users/', get_users),
    path('users/<int:user_id>/', get_user_detail),
    path('users/ban/', ban_user),
    path('users/unban/', unban_user),
    path(
        'dashboard-stats/',
        dashboard_stats
    ),
    path(
        "admins/create/",
        create_admin
    ),

    path(
        "tribe-requests/",
        list_tribe_requests,
    ),
  
    path(
        "tribe-requests/<int:pk>/",
        tribe_request_detail,
    ),
  
    path(
        "tribe-requests/create-tribe/",
        create_tribe_from_request,
    ),
  
    path(
        "tribe-requests/reject/",
        reject_tribe_request,
    ),
  
    path(
        "tribe-requests/<int:pk>/delete",
        delete_tribe_request,
    ),

    path(
        "tribes/",
        admin_tribes,
    ),
    path(
        "tribes/<int:tribe_id>/",
        admin_tribe_detail,
    ),
    
    path(
        "communities/create/",
        create_community,
    ),
    path(
        "tribes/create",
        create_tribe,
    ),
    path(
        "tribes/<int:pk>/update",
        update_tribe,
    ),
    path(
        "tribes/<int:pk>/delete",
        delete_tribe,
    ),
]
