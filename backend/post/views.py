from django.shortcuts import render
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from .media import attach_post_media
from .websocket import broadcast_post_stats
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db.models import Count, F, Exists, OuterRef, Case, When, Q, Max, FloatField, Value, ExpressionWrapper, Prefetch
from django.db import IntegrityError, transaction
from django.db.models.functions import Mod, Random
from random import randint
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from .services import *
from .cache import *
from ai.topics import extract_topics
from .weights import get_user_weights
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from .models import Post, Like, Comment, Feed, PostMedia, CommentLike, Repost, Share, PostView
from rest_framework.permissions import IsAuthenticated, BasePermission
from communities.models import Community, Tribe, CommunityMembership
from users.utils import redis_client, get_interest_map
from rest_framework.exceptions import PermissionDenied
from notifications.services import create_notification
from random import randint
from users.models import Star, BlockedUser
from users.interest import update_interest
from feedback.models import Report
from .serializers import PostSerializer, LikeSerializer, CommentSerializer, RepostSerializer

def should_count_view(last_view):
    if not last_view:
        return True

    return timezone.now() - last_view.viewed_at > timedelta(minutes=30)

class IsOwnerOrModerator(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        if obj.user == user:
            return True

        if obj.community:
            if obj.community.owner == user:
                return True
            if CommunityMembership.objects.filter(
                community=obj.community,
                user=user,
                role__in=["admin", "moderator"]
            ).exists():
                return True

        return False

class FeedPagination(PageNumberPagination):
    page_size = 10

    def paginate_queryset(self, queryset, request, view=None):
        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            self.page = None
            return []

    def get_paginated_response(self, data):
        if self.page is None:
            return Response({
                "count": 0,
                "next": None,
                "previous": None,
                "results": []
            })
        return super().get_paginated_response(data)

def safe_int(val):
    try:
        v = int(val)
        if v > 10**12:  # safety limit
            return None
        return v
    except:
        return None

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user__username', 'user', 'community']

    def get_queryset(self):
        user = self.request.user

        queryset = Post.objects.filter(is_deleted=False, is_approved=True).select_related('user', 'community')\
            .prefetch_related('likes', 'comments', 'media_files__asset')\
            .annotate(
                likes_count=Count('likes', distinct=True),
                comments_count=Count(
                    'comments',
                    filter=Q(comments__is_deleted=False),
                    distinct=True
                ),
                shares_count = Count('shares', distinct=True),
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
        community_id = safe_int(self.request.query_params.get('community'))
        if community_id:

          queryset = queryset.filter(
              community_id=community_id
          )
      
          # separate pinned feed
          if self.request.query_params.get("community_pinned") == "true":
              queryset = queryset.filter(community_pinned=False)
      
          queryset = queryset.order_by("-community_pinned", "community_pin_order", "-created_at")

        # Filter by user's communities
        if self.request.query_params.get('user_communities'):
            community_ids = CommunityMembership.objects.filter(
                  user=user,
                  banned=False
              ).values_list("community_id", flat=True)
            queryset = queryset.filter(community_id__in=community_ids)

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
      user = self.request.user
  
      is_staff = False
  
      if instance.community:
          is_staff = (
              instance.community.owner == user or
              CommunityMembership.objects.filter(
                  community=instance.community,
                  user=user,
                  role__in=["admin", "moderator"]
              ).exists()
          )
  
      if instance.user != user and not is_staff:
          raise PermissionDenied("Not allowed")
  
      username = instance.user.username
      instance.is_deleted = True
      instance.save(update_fields=["is_deleted"])
      invalidate_profile_cache(username)

    def create(self, request, *args, **kwargs):
      client_post_id = request.data.get("client_post_id")
  
      if client_post_id:
          existing_post = (
              Post.objects
              .select_related("user", "community")
              .prefetch_related(
                  "likes",
                  "comments",
                  "media_files__asset",
              )
              .filter(
                  client_post_id=client_post_id,
                  user=request.user,
                  is_deleted=False,
              )
              .first()
          )
  
          if existing_post:
              return Response(
                  PostSerializer(
                      existing_post,
                      context={"request": request},
                  ).data,
                  status=status.HTTP_200_OK,
              )
  
      serializer = self.get_serializer(data=request.data)
      serializer.is_valid(raise_exception=True)
  
      try:
          with transaction.atomic():
              self.perform_create(serializer)
  
      except IntegrityError:
          # Another request created the same post
          existing_post = (
              Post.objects
              .select_related("user", "community")
              .prefetch_related(
                  "likes",
                  "comments",
                  "media_files__asset",
              )
              .get(
                  client_post_id=client_post_id,
                  user=request.user,
              )
          )
  
          return Response(
              PostSerializer(
                  existing_post,
                  context={"request": request},
              ).data,
              status=status.HTTP_200_OK,
          )
  
      post = (
          Post.objects
          .select_related("user", "community")
          .prefetch_related(
              "likes",
              "comments",
              "media_files__asset",
          )
          .get(pk=serializer.instance.pk)
      )
  
      return Response(
          PostSerializer(
              post,
              context={"request": request},
          ).data,
          status=status.HTTP_201_CREATED,
      )
  
    def update(self, request, *args, **kwargs):
      partial = kwargs.pop("partial", False)
  
      instance = self.get_object()
  
      serializer = self.get_serializer(
          instance,
          data=request.data,
          partial=partial,
      )
      serializer.is_valid(raise_exception=True)
  
      self.perform_update(serializer)
  
      instance.refresh_from_db()
  
      instance = (
          Post.objects
          .select_related("user", "community")
          .prefetch_related("media_files__asset", "likes", "comments")
          .annotate(
              likes_count=Count("likes", distinct=True),
              comments_count=Count("comments", distinct=True),
              shares_count=Count("shares", distinct=True),
          )
          .get(pk=instance.pk)
      )
  
      return Response(
          PostSerializer(
              instance,
              context={"request": request},
          ).data
      )

    # ✅ Create post with moderation
    def perform_create(self, serializer):
      community = serializer.validated_data.get("community")
      user = self.request.user
  
      # default behavior: auto approve
      is_approved = True
  
      if community and community.require_post_approval:
          is_staff = (
              user == community.owner or
              CommunityMembership.objects.filter(
                  community=community,
                  user=user,
                  role__in=["admin", "moderator"]
              ).exists()
          )
  
          # only non-staff need approval
          if not is_staff:
              is_approved = False
  
      post = serializer.save(
          user=user,
          is_approved=is_approved
      )
      
      text = " ".join(
        filter(
            None,
            [
                post.caption,
            ]
        )
      )
      
      topics = extract_topics(text)
      
      post.topics = topics
      
      post.save(
          update_fields=[
              "topics",
          ]
      )
  
      media_files = self.request.data.get(
          "media_files",
          []
      )
  
      attach_post_media(
          post=post,
          user=user,
          media_files=media_files,
      )
  
      invalidate_profile_cache(user.username)

    def perform_update(self, serializer):
      instance = self.get_object()
      user = self.request.user
  
      is_moderator = CommunityMembership.objects.filter(
          community=instance.community,
          user=user,
          role__in=["admin", "moderator"],
      ).exists()
  
      if (
          instance.user != user
          and instance.community.owner != user
          and not is_moderator
      ):
          raise PermissionDenied("You cannot edit this post")
  
      old_caption = instance.caption
      old_files = list(
          instance.media_files.values_list(
              "asset__media_id",
              flat=True,
          )
      )
      
      updated_instance = serializer.save()
      
      media_files = self.request.data.get(
          "media_files"
      )
      
      if media_files is not None:
      
          updated_instance.media_files.all().delete()
      
          attach_post_media(
              post=updated_instance,
              user=user,
              media_files=media_files,
          )
      
      new_files = list(
          updated_instance.media_files.values_list(
              "asset__media_id",
              flat=True,
          )
      )
      
      if (
          updated_instance.caption != old_caption
          or old_files != new_files
      ):
          updated_instance.is_edited = True
      
          updated_instance.save(
              update_fields=["is_edited"]
          )
      invalidate_profile_cache(instance.user.username)

    @action(detail=True, methods=["post"])
    def repost(self, request, pk=None):
        original_post = self.get_object()
    
        repost_type = request.data.get("type", "normal")
        quote_text = request.data.get("quote_text", "")
    
        existing = Repost.objects.filter(
            user=request.user,
            post=original_post,
            repost_type=repost_type
        ).first()

        if existing:
          return Response(
              {
                  "detail": "You already reposted this post."
              },
              status=status.HTTP_400_BAD_REQUEST
          )

        repost = Repost.objects.create(
            user=request.user,
            post=original_post,
            repost_type=repost_type,
            quote_text=quote_text if repost_type == "quote" else None
        )
        invalidate_profile_cache(request.user.username)
    
        if original_post.user != request.user:

            create_notification(
                type="repost",
                recipient=original_post.user,
                actors=[request.user],
                post=original_post,
                community=original_post.community
            )

        return Response({"status": "reposted", "type": repost_type})

    @action(detail=True, methods=["post"])
    def toggle_repost(self, request, pk=None):
    
        post = self.get_object()
    
        repost = Repost.objects.filter(
            user=request.user,
            post=post,
            is_deleted=False
        ).first()
    
        # UNDO REPOST
        if repost:
            repost.is_deleted = True
            repost.save(update_fields=["is_deleted"])
            invalidate_profile_cache(request.user.username)
    
            return Response({
                "reposted": False
            })
    
        # CREATE REPOST
        repost = Repost.objects.create(
            user=request.user,
            post=post,
            repost_type="normal"
        )
        invalidate_profile_cache(request.user.username)
  
        if post.user != request.user:

            create_notification(
                type="repost",
                recipient=post.user,
                actors=[request.user],
                post=post,
                community=post.community
            )
    
        return Response({
            "reposted": True
        })

    @action(detail=True, methods=["post"])
    def view(self, request, pk=None):
        post = self.get_object()
        user = request.user
    
        watch_time = float(request.data.get("watch_time", 0))
        completed = request.data.get("completed", False)
        skipped = request.data.get("skipped", False)
    
        recent_limit = timezone.now() - timedelta(minutes=30)
    
        view = PostView.objects.filter(
            post=post,
            user=user,
            last_viewed_at__gte=recent_limit
        ).first()
    
        # 🎯 Define replay safely FIRST
        is_replay = watch_time > 0 and watch_time < 2.5
    
        # -----------------------------
        # NEW VIEW
        # -----------------------------
        if not view:
    
            view = PostView.objects.create(
                post=post,
                user=user,
                watch_time=watch_time,
                completed=completed,
                skipped=skipped,
                last_viewed_at=timezone.now(),
                replay_count=1 if is_replay else 0
            )
    
            # Update post stats
            update_fields = {
                "views_count": F("views_count") + 1
            }
    
            if is_replay:
                update_fields["replay_count"] = F("replay_count") + 1
    
            if skipped:
                update_fields["skipped_views"] = F("skipped_views") + 1
    
            Post.objects.filter(id=post.id).update(**update_fields)
    
        # -----------------------------
        # EXISTING VIEW (UPDATE ONLY)
        # -----------------------------
        else:
    
            if is_replay:
                PostView.objects.filter(id=view.id).update(
                    replay_count=F("replay_count") + 1
                )
    
                Post.objects.filter(id=post.id).update(
                    replay_count=F("replay_count") + 1
                )
    
            if skipped:
                Post.objects.filter(id=post.id).update(
                    skipped_views=F("skipped_views") + 1
                )
    
            view.watch_time = max(
                view.watch_time,
                watch_time
            )
    
            view.completed = (
                completed or view.completed
            )
    
            view.skipped = (
              skipped or view.skipped
            )
    
            view.last_viewed_at = timezone.now()
    
            view.save(update_fields=[
                "watch_time",
                "completed",
                "skipped",
                "last_viewed_at",
            ])
    
        post.refresh_from_db()

        broadcast_post_stats(post)
    
        if completed:
          value = 4
        elif skipped:
          value = -3
        else:
          value = 1
    
        for topic in post.topics:
          update_interest(
              user,
              topic,
              value,
          )

        return Response({
            "status": "view recorded",
            "views_count": post.views_count,
            "replay_count": post.replay_count,
            "skipped_views": post.skipped_views,
        })

    # ✅ Reels
    @action(detail=False, methods=['get'])
    def reels(self, request):
        user = request.user
    
        # 🔥 ENGAGEMENT ANNOTATIONS
        joined_communities = CommunityMembership.objects.filter(
          user=user
        ).values_list("community_id", flat=True)
  
        two_weeks_ago = timezone.now() - timedelta(days=14)
  
        qs = build_reels_queryset(user)
  
        tribe_id = request.query_params.get("tribe")

        if tribe_id:
            qs = qs.filter(
                community__tribe_id=tribe_id
            )
  
        cached = get_cached_reels(
            redis_client,
            user.id,
            tribe_id,
        )
        
        if cached:
            qs = qs.filter(id__in=cached)
        
            qs = annotate_reels_features(
                qs,
                joined_communities,
            )
        
            qs = compute_reels_score(qs)
        
            reels = list(qs)
            reel_map = {r.id: r for r in qs}

            reels = [
                reel_map[rid]
                for rid in cached
                if rid in reel_map
            ]
        
            reels = finalize_reels(
                reels,
                user,
            )
        
            page = self.paginate_queryset(reels)
        
            if page is not None:
                serializer = self.get_serializer(
                    page,
                    many=True,
                    context={"request": request},
                )
                return self.get_paginated_response(
                    serializer.data
                )

        # 🔥 REELS SCORING (IMPORTANT)
        qs = annotate_reels_features(qs, joined_communities)
        qs = (
          compute_reels_score(qs)
          .order_by("-final_score")[:500]
        )
    
        # 🔥 ORDER BY SCORE (TikTok style)
        reels = list(qs)

        reels = finalize_reels(
            reels,
            user,
        )
  
        set_cached_reels(
            redis_client,
            user.id,
            [r.id for r in reels],
            ttl=300,
            tribe_id=tribe_id,
        )
    
        # pagination
        page = self.paginate_queryset(reels)
    
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
    
        serializer = self.get_serializer(reels, many=True, context={'request': request})
        return Response(serializer.data)
  
    @action(detail=False, methods=["post"])
    def refresh_reels(self, request):
        user = request.user
    
        # New shuffle session
        redis_client.delete(f"feed_seed:{user.id}")
    
        # If you later cache reels
        for key in redis_client.scan_iter(
            f"reels:user:{user.id}:tribe:*"
        ):
            redis_client.delete(key)
    
        redis_client.set(
            f"feed_seed:{user.id}",
            randint(1, 999999),
            ex=1800,
        )
    
        return Response({
            "status": "reels refreshed"
        })

    @action(detail=True, methods=["post"])
    def share(self, request, pk=None):
        post = self.get_object()
    
        share, created = Share.objects.get_or_create(
            user=request.user,
            post=post,
            platform=request.data.get("platform", "unknown")
        )
    
        for topic in post.topics:
          update_interest(
              request.user,
              topic,
              10,
          )
  
        broadcast_post_stats(post)
    
        if created and post.user != request.user:

          create_notification(
              type="share",
              recipient=post.user,
              actors=[request.user],
              post=post,
              community=post.community
          )
    
        return Response({
            "shared": created,
            "shares_count": post.shares.count(),
            "platform": share.platform
        })

    # ✅ Report post
    @action(detail=True, methods=["post"])
    def report(self, request, pk=None):
        post = self.get_object()
    
        report, created = Report.objects.get_or_create(
            reporter=request.user,
            report_type="post",
            target_post=post,
            defaults={
                "reason": request.data.get("reason"),
                "details": request.data.get("details", "")
            }
        )
    
        if not created:
            return Response(
                {"message": "You already reported this post"},
                status=400
            )
    
        return Response({
            "success": True,
            "message": "Post reported successfully"
        })

    @action(detail=True, methods=["post"])
    def toggle_profile_pin(self, request, pk=None):
        post = self.get_object()
        user = request.user
    
        if post.user != user:
            return Response({"error": "Only your posts"}, status=403)
    
        # UNPIN
        if post.profile_pinned:
            post.profile_pinned = False
            post.profile_pin_order = None
            post.pin_updated_at = timezone.now()
            post.save()
    
            return Response({"profile_pinned": False})
    
        # LIMIT 3
        pinned_count = Post.objects.filter(
            user=user,
            profile_pinned=True
        ).count()
    
        if pinned_count >= 3:
            return Response({"error": "Max 3 pinned posts"}, status=400)
    
        # ORDER
        max_order = Post.objects.filter(
            user=user,
            profile_pinned=True
        ).aggregate(
            max_order=Max("profile_pin_order")
        )["max_order"] or 0
    
        post.profile_pinned = True
        post.profile_pin_order = max_order + 1
        post.pin_updated_at = timezone.now()
        post.save()
    
        return Response({
            "profile_pinned": True,
            "order": post.profile_pin_order
        })

    @action(detail=True, methods=["post"])
    def toggle_community_pin(self, request, pk=None):
        post = self.get_object()
        user = request.user
    
        if not post.community:
            return Response({"error": "Not community post"}, status=400)
    
        community = post.community
    
        membership = CommunityMembership.objects.filter(
            community=community,
            user=user,
            role__in=["admin", "moderator"]
        ).exists()
        if user != community.owner and not membership:
            return Response({"error": "Not allowed"}, status=403)
    
        # UNPIN
        if post.community_pinned:
            post.community_pinned = False
            post.community_pin_order = None
            post.pin_updated_at = timezone.now()
            post.save()
    
            return Response({"community_pinned": False})
    
        # LIMIT 5
        pinned_count = Post.objects.filter(
            community=community,
            community_pinned=True
        ).count()
    
        if pinned_count >= 5:
            return Response({"error": "Max 5 pinned posts"}, status=400)
    
        # ORDER
        max_order = Post.objects.filter(
            community=community,
            community_pinned=True
        ).aggregate(
            max_order=Max("community_pin_order")
        )["max_order"] or 0
    
        post.community_pinned = True
        post.community_pin_order = max_order + 1
        post.pin_updated_at = timezone.now()
        post.save()
    
        return Response({
            "community_pinned": True,
            "order": post.community_pin_order
        })

    @action(detail=False, methods=["post"])
    def reorder_pins(self, request):
        user = request.user
        post_ids = request.data.get("post_ids", [])
    
        if not isinstance(post_ids, list) or not post_ids:
            return Response({"error": "Invalid list"}, status=400)
    
        posts = list(
            Post.objects.filter(id__in=post_ids)
            .select_related("community")
        )
    
        if len(posts) != len(post_ids):
            return Response({"error": "Invalid posts"}, status=400)
    
        post_map = {p.id: p for p in posts}
        ordered_posts = [post_map[pid] for pid in post_ids if pid in post_map]
    
        first = ordered_posts[0]
    
        # =========================================
        # PROFILE PINS
        # =========================================
        if first.community is None:
    
            invalid = any(
                (
                    p.user_id != user.id or
                    p.community_id is not None or
                    not p.profile_pinned
                )
                for p in ordered_posts
            )
    
            if invalid:
                return Response(
                    {"error": "Invalid profile posts"},
                    status=403
                )
    
            if len(post_ids) > 3:
                return Response(
                    {"error": "Max 3 pins"},
                    status=400
                )
    
            with transaction.atomic():
    
                updates = []
    
                now = timezone.now()
    
                for index, post in enumerate(ordered_posts, start=1):
                    post.profile_pin_order = index
                    post.pin_updated_at = now
                    updates.append(post)
    
                Post.objects.bulk_update(
                    updates,
                    ["profile_pin_order", "pin_updated_at"]
                )
    
            return Response({
                "status": "profile reordered"
            })
    
        # =========================================
        # COMMUNITY PINS
        # =========================================
        community = first.community
    
        is_staff = (
            user == community.owner or
            CommunityMembership.objects.filter(
                community=community,
                user=user,
                role__in=["admin", "moderator"]
            ).exists()
        )
        
        if not is_staff:
            return Response(
                {"error": "Not allowed"},
                status=403
            )
    
        invalid = any(
            (
                p.community_id != community.id or
                not p.community_pinned
            )
            for p in ordered_posts
        )
    
        if invalid:
            return Response(
                {"error": "Mixed communities"},
                status=400
            )
    
        if len(post_ids) > 5:
            return Response(
                {"error": "Max 5 pins"},
                status=400
            )
    
        with transaction.atomic():
    
            updates = []
    
            now = timezone.now()
    
            for index, post in enumerate(ordered_posts, start=1):
                post.community_pin_order = index
                post.pin_updated_at = now
                updates.append(post)
    
            Post.objects.bulk_update(
                updates,
                ["community_pin_order", "pin_updated_at"]
            )
    
        return Response({
            "status": "community reordered"
        })

def get_annotated_post_queryset(user):
    return Post.objects.select_related("user", "community").annotate(
        likes_count=Count("likes", distinct=True),
        comments_count=Count("comments", distinct=True),
        shares_count=Count("shares", distinct=True),
        is_liked=Exists(
            Like.objects.filter(post=OuterRef("pk"), user=user)
        )
    )

class RepostViewSet(viewsets.ModelViewSet):

    serializer_class = RepostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):

      user = self.request.user
  
      annotated_posts = get_annotated_post_queryset(user)
  
      return Repost.objects.filter(
          is_deleted=False,
          post__is_deleted=False,
          post__is_approved=True,
      ).select_related(
          "user",
          "post",
          "post__user",
          "post__community"
      ).prefetch_related(
          Prefetch(
              "post",
              queryset=annotated_posts
          )
      ).order_by("-created_at")

    def perform_destroy(self, instance):
        user = self.request.user

        post = instance.post
        community = post.community

        is_owner = instance.user == user
        is_post_owner = post.user == user

        is_community_owner = (
            community and community.owner == user
        )

        is_moderator = (
            community and CommunityMembership.objects.filter(
                community=community,
                user=user,
                role__in=["admin", "moderator"]
            ).exists()
        )

        if not (
            is_owner or
            is_post_owner or
            is_community_owner or
            is_moderator
        ):
            raise PermissionDenied("Not allowed")

        username = instance.user.username
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])
        invalidate_profile_cache(username)

    def retrieve(self, request, *args, **kwargs):

      repost = self.get_object()
  
      annotated_post = (
          get_annotated_post_queryset(request.user)
          .filter(id=repost.post_id)
          .first()
      )
  
      repost.post = annotated_post
  
      serializer = self.get_serializer(repost)
  
      return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def reposts(self, request):
    
        user = request.user
    
        reposts = (
            Repost.objects.filter(
                user=user,
                is_deleted=False,
                post__is_deleted=False,
                post__is_approved=True,
            )
            .select_related(
                "user",
                "post",
                "post__user",
                "post__community"
            )
            .order_by("-created_at")
        )
    
        paginator = FeedPagination()
    
        page = paginator.paginate_queryset(
            reposts,
            request
        )
    
        # PRELOAD POSTS
        post_ids = [r.post_id for r in page]
    
        posts_map = {
            p.id: p
            for p in get_annotated_post_queryset(request.user)
            .filter(id__in=post_ids)
        }
    
        results = []
    
        for r in page:
    
            post_obj = posts_map.get(r.post_id)
    
            results.append({
                "id": r.id,
                "created_at": r.created_at,
                "repost_type": r.repost_type,
                "quote_text": r.quote_text,
                "user": {
                    "id": r.user.id,
                    "username": r.user.username,
                    "avatar": (
                        r.user.avatar.url
                        if r.user.avatar else None
                    )
                },
                "post": PostSerializer(
                    post_obj,
                    context={"request": request}
                ).data
            })
    
        return paginator.get_paginated_response(results)
  
class FeedViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        return Post.objects.none()

    def list(self, request, *args, **kwargs):
      user = request.user
  
      two_weeks_ago = (
          timezone.now() -
          timedelta(days=14)
      )
  
      joined_communities = CommunityMembership.objects.filter(
        user=user
      ).values_list("community_id", flat=True)
      tribe_id = request.query_params.get("tribe")
  
      starred_ids = set(
            Star.objects.filter(star=user).values_list("starred_user_id", flat=True)
      )
  
      feed_items = build_global_feed(
          user,
          joined_communities,
          starred_ids,
          two_weeks_ago,
          tribe_id
      )
  
      results = []
  
      for item in feed_items:
  
          if item["type"] == "post":
  
              results.append({
                  "type": "post",
                  "data": PostSerializer(
                      item["data"],
                      context={
                          "request": request
                      }
                  ).data
              })
  
          else:
  
              results.append({
                  "type": "repost",
                  "data": RepostSerializer(
                      item["data"],
                      context={
                          "request": request
                      }
                  ).data
              })
  
      page = self.paginate_queryset(results)

      response = self.get_paginated_response(page)

      response.data["starred_user_ids"] = starred_ids
      
      return response

    @action(detail=False, methods=["post"])
    def refresh(self, request):
    
        user = request.user
    
        # NEW RANDOM FEED SESSION
        for key in redis_client.scan_iter(
            f"feed:user:{user.id}:tribe:*"
        ):
            redis_client.delete(key)
  
        for key in redis_client.scan_iter(
            f"reels:user:{user.id}:tribe:*"
        ):
            redis_client.delete(key)
  
        redis_client.delete(f"feed:seen:{user.id}")
        redis_client.delete(f"feed_seed:{user.id}")
        redis_client.set(
            f"feed_seed:{user.id}",
            randint(1, 999999),
            ex=3600
        )
    
        return Response({
            "status": "feed refreshed"
        })

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

        likes_count = post.likes.count()
  
        broadcast_post_stats(post)

        value = 5 if liked else -5

        for topic in post.topics:
          update_interest(
              request.user,
              topic,
              value,
          )

        return Response({
            "liked": liked,
            "likes_count": likes_count
        })


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
      user = self.request.user
  
      return Comment.objects.select_related('user', 'post').filter(
          is_deleted=False
      )

    def list(self, request, *args, **kwargs):
      post_id = request.query_params.get("post")
  
      queryset = (
          self.get_queryset()
          .filter(
              post_id=post_id,
              parent__isnull=True,
          )
          .annotate(
              likes_count=Count("likes", distinct=True),
              is_liked=Exists(
                  CommentLike.objects.filter(
                      comment=OuterRef("pk"),
                      user=request.user,
                  )
              ),
          )
          .prefetch_related(
              Prefetch(
                  "replies",
                  queryset=Comment.objects.filter(
                      is_deleted=False
                  )
                  .select_related("user")
                  .annotate(
                      likes_count=Count("likes", distinct=True),
                      is_liked=Exists(
                          CommentLike.objects.filter(
                              comment=OuterRef("pk"),
                              user=request.user,
                          )
                      ),
                  )
                  .order_by("created_at"),
              )
          )
          .order_by("-created_at")
      )
  
      serializer = self.get_serializer(queryset, many=True)
      return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
      comment = self.get_object()
      user = request.user
  
      can_delete = (
          comment.user == user or
          comment.post.user == user or
          (
              comment.post.community and
              comment.post.community.moderators.filter(id=user.id).exists()
          )
      )
  
      if not can_delete:
          raise PermissionDenied()
  
      comment.is_deleted = True
      comment.text = "[deleted]"
      comment.save()
  
      channel_layer = get_channel_layer()

      async_to_sync(channel_layer.group_send)(
          f"post_{comment.post.id}",
          {
              "type": "comment_deleted",
              "post_id": comment.post.id,
              "comment_id": comment.id,
              "comments_count": comment.post.comments.filter(
                  is_deleted=False
              ).count(),
          }
      )
  
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
          parent=parent,
          client_id=self.request.data.get("client_id"),
      )
  
      channel_layer = get_channel_layer()
  
      comment_data = CommentSerializer(
        comment,
        context={"request": self.request},
      ).data

      async_to_sync(channel_layer.group_send)(
          f"post_{comment.post.id}",
          {
              "type": "new_comment",
              "post_id": comment.post.id,
              "comment": comment_data,
              "comments_count": comment.post.comments.filter(is_deleted=False).count(),
          }
      )

      post = comment.post

      for topic in post.topics:
        update_interest(
            self.request.user,
            topic,
            8,
        )
  
      if comment.post.user != self.request.user:

        create_notification(
            type="comment",
            recipient=comment.post.user,
            actors=[self.request.user],
            post=comment.post,
            community=comment.post.community
        )

      if parent and parent.user != self.request.user:

        create_notification(
            type="reply",
            recipient=parent.user,
            actors=[self.request.user],
            post=comment.post,
            community=comment.post.community
        )

    # ✅ Report comment
    @action(detail=True, methods=["post"])
    def report(self, request, pk=None):
        comment = self.get_object()
    
        report, created = Report.objects.get_or_create(
            reporter=request.user,
            report_type="comment",
            target_comment=comment,
            defaults={
                "reason": request.data.get("reason"),
                "details": request.data.get("details", "")
            }
        )
    
        if not created:
            return Response(
                {
                    "message": "You already reported this comment"
                },
                status=400
            )
    
        return Response({
            "success": True,
            "message": "Comment reported successfully"
        })

    @action(detail=True, methods=["patch"])
    def edit(self, request, pk=None):
        comment = self.get_object()
        user = request.user
    
        if comment.user != user:
            raise PermissionDenied("You cannot edit this comment")
    
        text = request.data.get("text")
    
        if not text:
            return Response({"message": "Text is required"}, status=400)
    
        comment.text = text
        comment.save()

        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"post_{comment.post.id}",
            {
                "type": "comment_updated",
                "comment": CommentSerializer(comment).data,
            }
        )
    
        return Response({
            "success": True,
            "text": comment.text
        })
  
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
            if created and comment.user != user:

              create_notification(
                  type="comment_like",
                  recipient=comment.user,
                  actors=[user],
                  post=comment.post,
                  community=comment.post.community
              )

        return Response({
            "is_liked": liked,
            "likes_count": comment.likes.count()
        })