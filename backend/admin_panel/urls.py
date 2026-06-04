from django.urls import path
from . import views

urlpatterns = [
    path('reports/', views.get_reports),
    path('reports/resolve/', views.resolve_report),
    path('reports/<int:report_id>/', views.delete_report),
    path('users/', views.get_users),
    path('users/<int:user_id>/', views.get_user_detail),
    path('users/ban/', views.ban_user),
    path('users/unban/', views.unban_user),
]