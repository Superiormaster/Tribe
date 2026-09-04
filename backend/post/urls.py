# post/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, LikeViewSet, CommentViewSet, RepostViewSet, CommentLikeViewSet, FeedViewSet, ShareViewSet, BookmarkViewSet

router = DefaultRouter()
router.register(r'post', PostViewSet, basename='post')
router.register(r'shares', ShareViewSet, basename='shares')
router.register(r'feed', FeedViewSet, basename='feed')
router.register(r'likes', LikeViewSet, basename='likes')
router.register(r'comment-likes', CommentLikeViewSet, basename='comment-likes')
router.register(r'comments', CommentViewSet, basename='comments')
router.register(
    r'reposts',
    RepostViewSet,
    basename='reposts'
)
router.register(
    r"bookmarks",
    BookmarkViewSet,
    basename="bookmarks",
)

urlpatterns = [
    path('', include(router.urls)),
]