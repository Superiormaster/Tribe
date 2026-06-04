from django.urls import path
from .views import (
    GlobalSearchView,
    trending_search,
    search_suggestions
)

urlpatterns = [
    path('', GlobalSearchView.as_view()),
    path("trending/", trending_search),
    path("suggestions/", search_suggestions),
]