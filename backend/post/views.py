from django.shortcuts import render
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from django.db.models import Count, F, Exists, OuterRef, Case, When, FloatField, Value
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from .models import Post, Like, Comment, Feed, PostMedia, CommentLike, Repost, Share, PostView
from rest_framework.permissions import IsAuthenticated, BasePermission
from communities.models import Community, Tribe
from django.db.models import Exists, OuterRef
from rest_framework.exceptions import PermissionDenied
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from users.models import Star
from .serializers import PostSerializer, LikeSerializer, CommentSerializer

class IsOwnerOrModerator(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        if obj.user == user:
            return True

        if obj.community:
            if obj.community.owner == user:
                return True
            if user in obj.community.moderators.all():
                return True

        return False

class FeedPagination(PageNumberPagination):
    page_size = 10
    max_page_size = 50

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.select_related('user', 'community').prefetch_related('likes', 'comments').order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user__username', 'user', 'community']

    def get_queryset(self):
        user = self.request.user

        queryset = Post.objects.filter(is_deleted=False, is_approved=True).select_related('user', 'community')\
            .prefetch_related('likes', 'comments')\
            .annotate(
                likes_count=Count('likes', distinct=True),
                comments_count=Count('comments', distinct=True),
                shares_count = Count('share', distinct=True),
                is_liked=Exists(
                    Like.objects.filter(
                        post=OuterRef('pk'),
                        user=user
                    )
                ),
    
                is_starred_by_user=Exists(
                    Star.objects.filter(
                        starred_user=OuterRef('user'),
                        star=user
                    )
                )
            )
        queryset = queryset.order_by('-created_at')

        # ✅ Pending posts (for moderators)
        if self.request.query_params.get('is_approved') == 'false':
            queryset = queryset.filter(is_approved=False)

        # Filter by community
        community_id = self.request.query_params.get('community')
        if community_id:
            queryset = queryset.filter(community_id=community_id)

        # Filter by user's communities
        if self.request.query_params.get('user_communities'):
            queryset = queryset.filter(community__members=user)

        # Filter by tribe
        tribe_id = self.request.query_params.get('tribe')
        if tribe_id:
            queryset = queryset.filter(community__tribe_id=tribe_id)

        # Star feed
        if self.request.query_params.get('feed') == 'star':
            star_ids = Star.objects.filter(
                star=self.request.user
            ).values_list('starred_user_id', flat=True)

            queryset = queryset.filter(user_id__in=star_ids)

        return queryset

    def get_permissions(self):
      if self.action in ['update', 'partial_update', 'destroy']:
          return [IsAuthenticated(), IsOwnerOrModerator()]
      return [IsAuthenticated()]

    # ✅ Soft delete
    def perform_destroy(self, instance):
      if instance.user != self.request.user:
          raise PermissionDenied("Not allowed")
  
      instance.is_deleted = True
      instance.save()

    # ✅ Create post with moderation
    def perform_create(self, serializer):
        community = serializer.validated_data.get('community')
        
        # Determine if the post should be auto-approved
        is_approved = True
        if community and community.moderators.exists() and community.require_post_approval:
            is_approved = False
    
        # Save the post
        post = serializer.save(user=self.request.user, is_approved=is_approved)
    
        # Attach media files if provided
        media_files = self.request.data.get('media_files', [])
        for media in media_files:
            PostMedia.objects.create(
                post=post,
                file=media['url'],
                media_type=media['type'],
                thumbnail=media.get('thumbnail')
            )

    def perform_update(self, serializer):
      instance = self.get_object()
  
      if instance.user != self.request.user and not instance.community.moderators.filter(id=self.request.user.id).exists():
          raise PermissionDenied("You cannot edit this post")
  
      serializer.save()

    @action(detail=True, methods=["post"])
    def repost(self, request, pk=None):
        original_post = self.get_object()
    
        new_post = Post.objects.create(
            user=request.user,
            caption=original_post.caption,
            content_type=original_post.content_type,
            community=original_post.community,
            is_approved=True
        )
    
        # copy media
        for media in original_post.media_files.all():
            PostMedia.objects.create(
                post=new_post,
                file=media.file,
                media_type=media.media_type,
                thumbnail=media.thumbnail
            )
    
        return Response({"status": "reposted", "new_post_id": new_post.id})

    @action(detail=True, methods=["post"])
    def view(self, request, pk=None):
        post = self.get_object()
        user = request.user
    
        obj, created = PostView.objects.get_or_create(
            post=post,
            user=user
        )
    
        if created:
            post.views_count = F("views_count") + 1
            post.save(update_fields=["views_count"])
    
        return Response({"status": "view recorded"})

    # ✅ Reels
    @action(detail=False, methods=['get'])
    def reels(self, request):
        reels = Post.objects.filter(
            content_type='short_video',
            community__tribe__allow_reels=True,
            is_deleted=False,
            is_approved=True
        ).select_related('community', 'user')\
         .prefetch_related('media_files')\
         .order_by('-created_at')
    
        page = self.paginate_queryset(reels)
        if page:
            serializer = PostSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
    
        serializer = PostSerializer(reels, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def share(self, request, pk=None):
        post = self.get_object()
    
        share, created = Share.objects.get_or_create(
            user=request.user,
            post=post,
            platform=request.data.get("platform", "unknown")
        )
    
        return Response({
            "shared": created,
            "shares_count": post.share_set.count(),
            "platform": share.platform
        })

    # ✅ Approve post
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        post = self.get_object()
        user = request.user
    
        if post.community.owner != user and user not in post.community.moderators.all():
            return Response({"error": "Not allowed"}, status=403)
    
        post.is_approved = True
        post.save()
    
        return Response({"status": "Post approved"})

    # ✅ Report post
    @action(detail=True, methods=['post'])
    def report(self, request, pk=None):
        post = self.get_object()
        reason = request.data.get('reason')
    
        Report.objects.create(
            post=post,
            user=request.user,
            reason=reason
        )
    
        return Response({'status': 'Reported'})
 
    @action(detail=True, methods=["post"])
    def toggle_pin(self, request, pk=None):
        post = self.get_object()
        community = post.community
        user = request.user
    
        is_owner = community.owner == user
        is_admin = community.members.filter(id=user.id).exists() and \
                    community.membership_set.filter(user=user, role="admin").exists()
    
        if not is_owner and not is_admin:
            return Response({"error": "Not allowed"}, status=403)
    
        post.is_pinned = not post.is_pinned
        post.save()
    
        return Response({
            "id": post.id,
            "is_pinned": post.is_pinned
        })

    # ✅ Trending
    @action(detail=False, methods=["get"])
    def trending(self, request):
        posts = (
            Post.objects.filter(
              is_deleted=False, is_approved=True
            ).annotate(
                likes_count=Count("likes"),
                comments_count=Count("comments")
            )
            .annotate(
                score=F("likes_count") * 3 + F("comments_count") * 5
            )
            .order_by("-score", "-created_at")[:20]
        )
        serializer = PostSerializer(posts, many=True, context={"request": request})
        return Response(serializer.data)

class FeedViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        two_weeks_ago = now - timedelta(days=14)

        interests = user.interests or []

        # -----------------------
        # BASE QUERYSET
        # -----------------------
        qs = Post.objects.filter(
            is_deleted=False,
            is_approved=True
        ).select_related("user", "community")

        # -----------------------
        # ENGAGEMENT SIGNALS
        # -----------------------
        qs = qs.annotate(
            likes_count=Count("likes", distinct=True),
            comments_count=Count("comments", distinct=True),
        )

        # -----------------------
        # VIEWED FILTER (IMPORTANT)
        # -----------------------
        seen_posts = PostView.objects.filter(
            user=user
        ).values_list("post_id", flat=True)

        qs = qs.exclude(id__in=seen_posts)

        # -----------------------
        # STAR SIGNAL
        # -----------------------
        qs = qs.annotate(
            is_from_starred=Case(
                When(
                    user__stars_received__star=user,
                    then=Value(1.0)
                ),
                default=Value(0.0),
                output_field=FloatField()
            )
        )

        # -----------------------
        # INTEREST SIGNAL
        # -----------------------
        qs = qs.annotate(
            interest_match=Case(
                When(user__interests__overlap=interests, then=Value(1.0)),
                default=Value(0.0),
                output_field=FloatField()
            )
        )

        # -----------------------
        # POPULARITY THRESHOLD
        # -----------------------
        qs = qs.annotate(
            is_popular=Case(
                When(
                    likes_count__gte=10,
                    comments_count__gte=3,
                    then=Value(1.0)
                ),
                default=Value(0.0),
                output_field=FloatField()
            )
        )

        # -----------------------
        # RECENCY BOOST (2 WEEKS)
        # -----------------------
        qs = qs.annotate(
            is_recent=Case(
                When(created_at__gte=two_weeks_ago, then=Value(1.0)),
                default=Value(0.0),
                output_field=FloatField()
            )
        )

        # -----------------------
        # FINAL SCORE (REAL FEED ENGINE)
        # -----------------------
        qs = qs.annotate(
            final_score=(
                F("likes_count") * 2 +
                F("comments_count") * 3 +
                F("views_count") * 0.2 +
                F("interest_match") * 5 +
                F("is_from_starred") * 6 +
                F("is_popular") * 4 +
                F("is_recent") * 2
            )
        )

        # -----------------------
        # FINAL ORDERING
        # -----------------------
        return qs.order_by(
            "-is_from_starred",
            "-final_score",
            "-created_at"
        )

class LikeViewSet(viewsets.ModelViewSet):
    queryset = Like.objects.all()
    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        post = Post.objects.get(pk=pk)
        user = request.user

        like, created = Like.objects.get_or_create(user=user, post=post)

        if not created:
            like.delete()
            liked = False
        else:
            liked = True
            channel_layer = get_channel_layer()
            async_to_sync (channel_layer.group_send)(
                f"user_{post.user.id}",
                {
                    "type": "send_notification",
                    "message": f"{user.username} liked your post"
                }
            )

        likes_count = post.likes.count()

        return Response({
            "liked": liked,
            "likes_count": likes_count
        })


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
      post_id = self.request.query_params.get('post')
  
      if not post_id:
          return Comment.objects.none()
  
      try:
          post_id = int(post_id)
      except (ValueError, TypeError):
          return Comment.objects.none()
  
      return Comment.objects.select_related('user', 'post')\
          .filter(post_id=post_id, parent__isnull=True, is_deleted=False)\
          .order_by('-created_at')

    @action(detail=True, methods=["post"])
    def delete_comment(self, request, pk=None):
        comment = self.get_object()
    
        # only owner can delete (or extend later for mods)
        if comment.user != request.user:
            raise PermissionDenied("You cannot delete this comment")
    
        comment.is_deleted = True
        comment.text = "[deleted]"
        comment.save()
    
        return Response({"status": "deleted"})

    def perform_create(self, serializer):
      parent_id = self.request.data.get("parent")
  
      parent = None
      if parent_id:
          try:
              parent = Comment.objects.get(id=parent_id)
          except Comment.DoesNotExist:
              parent = None
  
      comment = serializer.save(
          user=self.request.user,
          parent=parent
      )
  
      channel_layer = get_channel_layer()
      async_to_sync(channel_layer.group_send)(
          f'post_{comment.post.id}',
          {
              'type': 'new_comment',
              'comment': CommentSerializer(comment, context={'request': self.request}).data
          }
      )
  
class CommentLikeViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        comment = Comment.objects.get(pk=pk)
        user = request.user

        like, created = CommentLike.objects.get_or_create(
            comment=comment,
            user=user
        )

        if not created:
            like.delete()
            liked = False
        else:
            liked = True

        return Response({
            "liked": liked,
            "likes_count": comment.likes.count()
        })