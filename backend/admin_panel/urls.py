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
    reply_contact_message,
    support_requests,
    support_request_detail,
    resolve_support_request,
    reject_support_request,
    review_support_request,
    close_support_request,
    delete_support_request,
    update_support_request,
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
    update_contact_message,
    contact_message_detail,
    contact_messages,
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
        "tribe-requests/<int:pk>/delete/",
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
        "contacts/<int:message_id>/reply/",
        reply_contact_message,
    ),
    
    path(
        "communities/create/",
        create_community,
    ),
    path(
        "tribes/create/",
        create_tribe,
    ),
    path(
        "tribes/<int:tribe_id>/update/",
        update_tribe,
    ),
    path(
        "tribes/<int:tribe_id>/delete/",
        delete_tribe,
    ),
    path(
        "support/",
        support_requests,
    ),
    
    path(
        "support/<int:support_id>/",
        support_request_detail,
    ),
    
    path(
        "support/resolve/",
        resolve_support_request,
    ),
    
    path(
        "support/reject/",
        reject_support_request,
    ),
    
    path(
        "support/review/",
        review_support_request,
    ),
    
    path(
        "support/close/",
        close_support_request,
    ),
    
    path(
        "support/<int:support_id>/delete/",
        delete_support_request,
    ),

    path(
        "support/<int:support_id>/update/",
        update_support_request,
    ),
    path(
        "contacts/",
        contact_messages
    ),
    
    path(
        "contacts/<int:message_id>/",
        contact_message_detail
    ),
    
    path(
        "contacts/<int:message_id>/update/",
        update_contact_message
    ),
]
