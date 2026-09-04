from django.shortcuts import render
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from .media import attach_post_media
from .websocket import broadcast_post_stats
from channels.layers import get_channel_layer
from .tasks import extract_post_topics_task
from asgiref.sync import async_to_sync
from django.db.models import Count, F, Exists, OuterRef, Case, When, Q, Max, FloatField, Value, ExpressionWrapper, Prefetch
from django.db import IntegrityError, transaction
from django.db.models.functions import Mod, Random
from random import randint
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.response import Response
from .services import *
from .cache import *
from ai.topics import extract_topics
from .weights import get_user_weights
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from .models import Post, Like, Comment, Feed, PostMedia, CommentLike, Repost, Share, PostView, Bookmark
from rest_framework.permissions import IsAuthenticated, BasePermission
from communities.models import Community, Tribe, CommunityMembership
from users.utils import redis_client
from notifications.recommendations.interests import (
    update_interests,
)
from notifications.recommendations.scoring import (
    interaction_weight,
)
from notifications.recommendations.activity import (
    record_post_view,
)
from rest_framework.exceptions import PermissionDenied
from notifications.createNotification import create_notification
from random import randint
from users.models import Star, BlockedUser
from users.utils import get_user_avatar
from feedback.models import Report
from .serializers import PostSerializer, LikeSerializer, CommentSerializer, RepostSerializer, ShareSerializer, BookmarkSerializer

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

class BookmarkPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

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
      print(
          "USER:",
          self.request.user.id,
          flush=True,
      )
      
      print(
          "REQUEST DATA:",
          self.request.data,
          flush=True,
      )
      
      print(
          "CONTENT TYPE:",
          self.request.content_type,
          flush=True,
      )
      
      print(
          "FILES:",
          self.request.FILES,
          flush=True,
      )
      
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
      if not serializer.is_valid():

        print(
            "🔥🔥🔥 POST SERIALIZER ERROR 🔥🔥🔥",
            serializer.errors,
            flush=True,
        )
    
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )
  
      try:
          with transaction.atomic():
              self.perform_create(serializer)
  
      except IntegrityError as exc:

          print(
              "=== POST INTEGRITY ERROR ===",
              repr(exc),
              flush=True,
          )
      
          if not client_post_id:
              raise

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
  
          raise
  
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
  
      print(
          "========================================",
          flush=True,
      )
      
      print(
          "=== POST CREATE DEBUG ===",
          flush=True,
      )
      
      print(
          "USER:",
          self.request.user.id,
          flush=True,
      )
      
      print(
          "REQUEST DATA:",
          self.request.data,
          flush=True,
      )
      
      print(
          "CONTENT TYPE:",
          self.request.content_type,
          flush=True,
      )
      
      print(
          "FILES:",
          self.request.FILES,
          flush=True,
      )
    
      print(
          "========================================",
          flush=True,
      )
  
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
     
      print(
          "=== POST SAVED ===",
          post.id,
          flush=True,
      )
  
      media_files = self.request.data.get(
          "media_files",
          []
      )
  
      print(
          "=== MEDIA FILES BEFORE ATTACH ===",
          media_files,
          flush=True,
      )
  
      try:
          attach_post_media(
              post=post,
              user=user,
              media_files=media_files,
          )
  
          print(
              "=== MEDIA ATTACH FINISHED ===",
              flush=True,
          )
  
      except Exception as exc:
          print(
              "🔥🔥🔥 MEDIA ATTACH ERROR 🔥🔥🔥",
              repr(exc),
              flush=True,
          )
          raise

      transaction.on_commit(
          lambda: extract_post_topics_task.delay(
              post.id
          )
      )

      print(
          "=== TOPIC EXTRACTION SCHEDULED ===",
          post.id,
          flush=True,
      )
  
      invalidate_profile_cache(user.username)
  
      print(
          "🔥🔥🔥 PERFORM_CREATE FINISHED 🔥🔥🔥",
          flush=True,
      )

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
    def share(self, request, pk=None):
    
        post = self.get_object()
    
        platform = request.data.get(
            "platform",
            "unknown"
        )
    
        allowed_platforms = {
            "copy_link",
            "whatsapp",
            "telegram",
            "facebook",
            "x",
            "messenger",
            "native",
        }
    
        if platform not in allowed_platforms:
            return Response(
                {
                    "detail": "Invalid sharing platform."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
        share, created = Share.objects.get_or_create(
            user=request.user,
            post=post,
            community=None,
            platform=platform,
            defaults={
                "status": "approved",
            }
        )
    
        # Update interests only for a real/new share
        if created:
            for topic in post.topics:
                update_interests(
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
                community=None,
            )
    
        share_count = Share.objects.filter(
            post=post,
            is_deleted=False,
            status="approved",
        ).count()
    
        return Response(
            {
                "shared": created,
                "shares_count": share_count,
                "platform": platform,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="community-share")
    def community_share(self, request, pk=None):
    
        original_post = self.get_object()
    
        community_ids = request.data.get(
            "community_ids",
            []
        )
    
        share_text = request.data.get(
            "share_text",
            ""
        ).strip()
    
        if not isinstance(community_ids, list):
    
            return Response(
                {
                    "detail": "community_ids must be a list."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
        if not community_ids:
    
            return Response(
                {
                    "detail": "At least one community is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
        community_ids = list(dict.fromkeys(community_ids))
  
        if len(community_ids) > 10:
          return Response(
              {
                  "detail": "You can share to a maximum of 10 communities at once."
              },
              status=status.HTTP_400_BAD_REQUEST
          )
    
        communities = Community.objects.filter(
            id__in=community_ids
        )
    
        communities_map = {
            str(community.id): community
            for community in communities
        }
    
        missing_ids = [
            community_id
            for community_id in community_ids
            if str(community_id)
            not in communities_map
        ]
    
        if missing_ids:
    
            return Response(
                {
                    "detail":
                        "One or more communities were not found.",
                    "missing": missing_ids,
                },
                status=status.HTTP_404_NOT_FOUND
            )
    
        memberships = (
            CommunityMembership.objects
            .filter(
                community_id__in=community_ids,
                user=request.user,
            )
            .values_list(
                "community_id",
                flat=True
            )
        )
    
        member_ids = {
            str(cid)
            for cid in memberships
        }
    
        not_member = [
            community_id
            for community_id in community_ids
            if str(community_id)
            not in member_ids
        ]
    
        if not_member:
    
            return Response(
                {
                    "detail":
                        "You must be a member of all selected communities.",
                    "communities": not_member,
                },
                status=status.HTTP_403_FORBIDDEN
            )
    
        created_shares = []
    
        pending = []
        approved = []
    
        with transaction.atomic():
    
            for community_id in community_ids:
    
                community = communities_map[
                    str(community_id)
                ]
    
                # Prevent duplicate
                existing = Share.objects.filter(
                    user=request.user,
                    post=original_post,
                    community=community,
                    is_deleted=False,
                ).first()
    
                if existing:
                    continue
    
                requires_approval = (
                    community.require_post_approval
                )
    
                share_status = (
                    "pending"
                    if requires_approval
                    else "approved"
                )
    
                share = Share.objects.create(
                    user=request.user,
                    post=original_post,
                    community=community,
                    platform="community",
                    share_text=share_text or None,
                    status=share_status,
                )
    
                created_shares.append(share)
    
                share_data = {
                    "id": share.id,
                    "community": {
                        "id": community.id,
                        "name": community.name,
                    },
                    "status": share.status,
                }
    
                if share_status == "pending":
                    pending.append(share_data)
                else:
                    approved.append(share_data)
    
                if original_post.user != request.user:
    
                    create_notification(
                        type="share",
                        recipient=original_post.user,
                        actors=[request.user],
                        post=original_post,
                        community=community,
                    )
    
        update_interests(
            user=request.user,
            topics=post.topics or [],
            weight=7,
        )

        invalidate_profile_cache(
            request.user.username
        )
    
        share_count = Share.objects.filter(
            post=original_post,
            is_deleted=False,
            status="approved",
        ).count()
    
        if pending and approved:
            overall_status = "mixed"
    
        elif pending:
            overall_status = "pending"
    
        elif approved:
            overall_status = "approved"
    
        else:
            overall_status = "already_shared"
    
        return Response(
            {
                "status": overall_status,
                "type": "community_share",
    
                "created": len(created_shares),
    
                "shares_count": share_count,
    
                "pending_count": len(pending),
                "approved_count": len(approved),
    
                "pending": pending,
                "approved": approved,
            },
            status=status.HTTP_201_CREATED
        )

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

        update_interests(
            user=request.user,
            topics=post.topics or [],
            weight=8,
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
    
        watch_time = float(request.data.get("watch_time") or 0)
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
    
        record_post_view(
            user_id=request.user.id,
            post_id=post.id,
        )

        if completed:
          value = 4
        elif skipped:
          value = -3
        else:
          value = 1
    
        update_interests(
          user=request.user,
          topics=post.topics or [],
          weight=value,
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
    
        print("🔥🔥 REELS REFRESH START", flush=True)
        print("USER:", user.id, flush=True)
  
        tribe_id = request.query_params.get("tribe")
    
        print(
            "🔥 REELS REFRESH TRIBE:",
            tribe_id,
            flush=True,
        )
  
        if tribe_id:
            cache_key = f"reels:user:{user.id}:tribe:{tribe_id}"
    
            print(
                "🔥 DELETE REELS CACHE:",
                cache_key,
                flush=True,
            )
    
            redis_client.delete(cache_key)
    
        else:
            # Refresh all tribe-specific reel caches
            for key in redis_client.scan_iter(
                f"reels:user:{user.id}:tribe:*"
            ):
                print(
                    "🔥 DELETE REELS CACHE:",
                    key,
                    flush=True,
                )
    
                redis_client.delete(key)
  
        seed = randint(1, 999999)
    
        redis_client.set(
            f"feed_seed:{user.id}",
            seed,
            ex=1800,
        )
    
        print(
            "🔥 NEW REELS SEED:",
            seed,
            flush=True,
        )
  
        joined_communities = (
            CommunityMembership.objects
            .filter(user=user)
            .values_list(
                "community_id",
                flat=True,
            )
        )
  
        qs = build_reels_queryset(user)
    
        if tribe_id:
            qs = qs.filter(
                community__isnull=False,
                community__tribe_id=tribe_id,
            )
  
        qs = annotate_reels_features(
            qs,
            joined_communities,
        )
    
        qs = (
            compute_reels_score(qs)
            .order_by("-final_score")[:500]
        )
    
        reels = list(qs)
    
        print(
            "🔥 REELS CANDIDATES:",
            len(reels),
            flush=True,
        )
  
        reels = finalize_reels(
            reels,
            user,
        )
    
        print(
            "🔥 REELS FINALIZED:",
            len(reels),
            flush=True,
        )
  
        reel_ids = [
            reel.id
            for reel in reels
        ]
    
        set_cached_reels(
            redis_client,
            user.id,
            reel_ids,
            ttl=300,
            tribe_id=tribe_id,
        )
    
        print(
            "🔥🔥 REELS CACHE REBUILT:",
            {
                "user": user.id,
                "tribe_id": tribe_id,
                "reels": len(reel_ids),
            },
            flush=True,
        )
    
        return Response({
            "status": "reels refreshed",
            "items": len(reel_ids),
            "tribe": tribe_id,
            "seed": seed,
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
        comments_count=Count(
            "comments",
            filter=Q(comments__is_deleted=False),
            distinct=True,
        ),
        shares_count=Count(
            "shares",
            filter=Q(
                shares__is_deleted=False,
                shares__status="approved",
            ),
            distinct=True,
        ),
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
                    "avatar": get_user_avatar(r.user),
                },
                "post": PostSerializer(
                    post_obj,
                    context={"request": request}
                ).data
            })
    
        return paginator.get_paginated_response(results)

class ShareViewSet(viewsets.ModelViewSet):

    serializer_class = ShareSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):

      user = self.request.user
  
      annotated_posts = get_annotated_post_queryset(user)
  
      return (
          Share.objects.filter(
              is_deleted=False,
              post__is_deleted=False,
          )
          .select_related(
              "user",
              "post",
              "post__user",
              "post__community",
              "community",
          )
          .prefetch_related(
              Prefetch(
                  "post",
                  queryset=annotated_posts
              )
          )
          .order_by("-created_at")
      )

    def perform_destroy(self, instance):

        user = self.request.user

        post = instance.post
        community = instance.community

        is_owner = instance.user == user
        is_post_owner = post.user == user

        is_community_owner = (
            community and community.owner == user
        )

        is_moderator = (
            community
            and CommunityMembership.objects.filter(
                community=community,
                user=user,
                role__in=["admin", "moderator"]
            ).exists()
        )

        if not (
            is_owner
            or is_post_owner
            or is_community_owner
            or is_moderator
        ):
            raise PermissionDenied("Not allowed")

        username = instance.user.username

        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

        invalidate_profile_cache(username)

    def retrieve(self, request, *args, **kwargs):

      share = self.get_object()
  
      user = request.user
  
      # Normal approved share
      if share.status == "approved":
          pass
  
      else:
          community = share.community
  
          is_owner = share.user == user
  
          is_post_owner = share.post.user == user
  
          is_community_owner = (
              community
              and community.owner == user
          )
  
          is_moderator = (
              community
              and CommunityMembership.objects.filter(
                  community=community,
                  user=user,
                  role__in=["admin", "moderator"],
              ).exists()
          )
  
          if not (
              is_owner
              or is_post_owner
              or is_community_owner
              or is_moderator
          ):
              raise PermissionDenied(
                  "You do not have permission to view this share."
              )
  
      annotated_post = (
          get_annotated_post_queryset(user)
          .filter(id=share.post_id)
          .first()
      )
  
      if not annotated_post:
          raise NotFound(
              "The original post could not be found."
          )
  
      share.post = annotated_post
    
      serializer = ShareSerializer(
        share,
        context={
            "request": request,
        }
      )
  
      return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def shares(self, request):

        user = request.user

        shares = (
            Share.objects.filter(
                user=user,
                is_deleted=False,
                post__is_deleted=False,
                post__is_approved=True,
            )
            .select_related(
                "user",
                "post",
                "post__user",
                "post__community",
                "community",
            )
            .order_by("-created_at")
        )

        paginator = FeedPagination()

        page = paginator.paginate_queryset(
            shares,
            request
        )

        # PRELOAD POSTS
        post_ids = [s.post_id for s in page]

        posts_map = {
            p.id: p
            for p in get_annotated_post_queryset(request.user)
            .filter(id__in=post_ids)
        }

        # PRELOAD STARRED USERS
        user_ids = [s.user_id for s in page]

        starred_ids = set(
            Star.objects.filter(
                user_id__in=user_ids,
                starred_by=request.user
            ).values_list(
                "user_id",
                flat=True
            )
        )

        results = []

        for s in page:

            post_obj = posts_map.get(s.post_id)

            results.append({
                "id": s.id,
                "type": "share",
                "created_at": s.created_at,
                "share_text": s.share_text,

                "community": {
                    "id": s.community.id,
                    "name": s.community.name,
                } if s.community else None,

                "user": {
                    "id": s.user.id,
                    "username": s.user.username,
                    "avatar": get_user_avatar(s.user),
                },

                "post": PostSerializer(
                    post_obj,
                    context={
                        "request": request,
                        "starred_ids": starred_ids,
                    }
                ).data,

                "is_starred_by_user": (
                    s.user_id in starred_ids
                ),
            })

        return paginator.get_paginated_response(results)

class BookmarkViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookmarkSerializer
    pagination_class = BookmarkPagination

    def get_queryset(self):
        return (
            Bookmark.objects
            .filter(user=self.request.user)
            .select_related(
                # Original post
                "post",
                "post__user",
                "post__community",

                # Repost
                "repost",
                "repost__user",
                "repost__post",
                "repost__post__user",
                "repost__post__community",

                # Share
                "share",
                "share__user",
                "share__post",
                "share__post__user",
                "share__post__community",
            )
            .order_by("-created_at")
        )
  
    @action(
        detail=False,
        methods=["post"],
        url_path="toggle",
    )
    def toggle(self, request):
    
        item_type = request.data.get("type")
    
        # =====================================================
        # NORMAL POST / REEL
        # =====================================================
    
        if item_type in ["post", "reel"]:
    
            post_id = request.data.get("post_id")
    
            if not post_id:
                return Response(
                    {"detail": "post_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
    
            try:
                post = Post.objects.get(
                    pk=post_id,
                    is_deleted=False,
                )
            except Post.DoesNotExist:
                return Response(
                    {"detail": "Post not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
    
            bookmark = Bookmark.objects.filter(
                user=request.user,
                post=post,
                repost__isnull=True,
                share__isnull=True,
            ).first()
    
            if bookmark:
                bookmark.delete()
                bookmarked = False
                bookmark_id = None
            
            else:
                new_bookmark = Bookmark.objects.create(
                    user=request.user,
                    post=post,
                )
                bookmarked = True
                bookmark_id = new_bookmark.id
                update_interests(
                    user=request.user,
                    topics=post.topics or [],
                    weight=8,
                )
    
                # Don't notify yourself
                if post.user != request.user:
                    create_notification(
                        type="bookmark",
                        recipient=post.user,
                        actors=[request.user],
                        post=post,
                        community=post.community,
                    )
    
            return Response({
                "bookmarked": bookmarked,
                "bookmark_id": bookmark_id,
                "type": (
                    "reel"
                    if post.content_type == "short_video"
                    else "post"
                ),
                "post_id": post.id,
                "bookmarks_count": post.bookmarks.count(),
            })
    
        if item_type == "repost":
    
            repost_id = request.data.get("repost_id")
    
            if not repost_id:
                return Response(
                    {"detail": "repost_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
    
            try:
                repost = (
                    Repost.objects
                    .select_related(
                        "post",
                        "post__user",
                        "post__community",
                    )
                    .get(
                        pk=repost_id,
                        is_deleted=False,
                    )
                )
            except Repost.DoesNotExist:
                return Response(
                    {"detail": "Repost not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
    
            bookmark = Bookmark.objects.filter(
                user=request.user,
                repost=repost,
            ).first()
    
            if bookmark:
                bookmark.delete()
                bookmarked = False
                bookmark_id = None
            
            else:
                new_bookmark = Bookmark.objects.create(
                    user=request.user,
                    post=repost.post,
                    repost=repost,
                )
                bookmarked = True
                bookmark_id = new_bookmark.id
                update_interests(
                    user=request.user,
                    topics=repost.post.topics or [],
                    weight=8,
                )
    
                # Notify the person who created the repost
                if repost.user != request.user:
                    create_notification(
                        type="bookmark",
                        recipient=repost.user,
                        actors=[request.user],
                        post=repost.post,
                        community=repost.post.community,
                    )
    
            return Response({
                "bookmarked": bookmarked,
                "bookmark_id": bookmark_id,
                "type": "repost",
                "repost_id": repost.id,
                "bookmarks_count": repost.bookmarks.count(),
            })
    
        if item_type == "share":
    
            share_id = request.data.get("share_id")
    
            if not share_id:
                return Response(
                    {"detail": "share_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
    
            try:
                share = (
                    Share.objects
                    .select_related(
                        "post",
                        "post__user",
                        "post__community",
                    )
                    .get(
                        pk=share_id,
                        is_deleted=False,
                    )
                )
            except Share.DoesNotExist:
                return Response(
                    {"detail": "Share not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
    
            bookmark = Bookmark.objects.filter(
                user=request.user,
                share=share,
            ).first()
    
            if bookmark:
                bookmark.delete()
                bookmarked = False
                bookmark_id = None
            
            else:
                new_bookmark = Bookmark.objects.create(
                    user=request.user,
                    post=share.post,
                    share=share,
                )
                bookmarked = True
                bookmark_id = new_bookmark.id
                update_interests(
                    user=request.user,
                    topics=share.post.topics or [],
                    weight=8,
                )
    
                # Notify the person who shared it
                if share.user != request.user:
                    create_notification(
                        type="bookmark",
                        recipient=share.user,
                        actors=[request.user],
                        post=share.post,
                        community=share.post.community,
                    )
    
            return Response({
                "bookmarked": bookmarked,
                "bookmark_id": bookmark_id,
                "type": "share",
                "share_id": share.id,
                "bookmarks_count": share.bookmarks.count(),
            })
    
        return Response(
            {
                "detail": (
                    "Invalid type. "
                    "Expected post, reel, repost, or share."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

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
                    context={"request": request}
                ).data
            })
    
        elif item["type"] == "repost":
    
            results.append({
                "type": "repost",
                "data": RepostSerializer(
                    item["data"],
                    context={"request": request}
                ).data
            })
    
        elif item["type"] == "share":
    
            results.append({
                "type": "share",
                "data": ShareSerializer(
                    item["data"],
                    context={"request": request}
                ).data
            })
  
      page = self.paginate_queryset(results)

      response = self.get_paginated_response(page)

      response.data["starred_user_ids"] = starred_ids
      
      print(
          "FEED RESPONSE DEBUG:",
          {
              "user": user.id,
              "page": request.query_params.get("page"),
              "feed_items": len(feed_items),
              "results": len(results),
          }
      )
  
      return response

    @action(detail=False, methods=["post"])
    def refresh(self, request):
    
        user = request.user
    
        print("🔥🔥 FEED REFRESH START", flush=True)
        print("USER:", user.id, flush=True)
    
        for key in redis_client.scan_iter(
            f"feed:user:{user.id}:tribe:*"
        ):
            print("🔥 DELETE FEED CACHE:", key, flush=True)
            redis_client.delete(key)
    
        redis_client.delete(
            f"feed:seen:{user.id}"
        )
    
        new_seed = randint(1, 999999)
    
        redis_client.set(
            f"feed_seed:{user.id}",
            new_seed,
            ex=3600
        )
    
        print(
            "🔥 NEW FEED SEED:",
            new_seed,
            flush=True
        )
    
        two_weeks_ago = (
            timezone.now() -
            timedelta(days=14)
        )
    
        joined_communities = (
            CommunityMembership.objects
            .filter(user=user)
            .values_list(
                "community_id",
                flat=True
            )
        )
    
        starred_ids = set(
            Star.objects
            .filter(star=user)
            .values_list(
                "starred_user_id",
                flat=True
            )
        )
    
        print(
            "🔥🔥 REBUILDING GLOBAL FEED",
            flush=True
        )
    
        rebuilt = build_global_feed(
            user,
            joined_communities,
            starred_ids,
            two_weeks_ago,
            tribe_id=None,
        )
    
        print(
            "🔥🔥 REFRESH REBUILD COMPLETE:",
            {
                "user": user.id,
                "items": len(rebuilt),
            },
            flush=True
        )
    
        return Response({
            "status": "feed refreshed",
            "items": len(rebuilt),
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

        update_interests(
          user=request.user,
          topics=post.topics or [],
          weight=value,
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
  
      update_interests(
        user=self.request.user,
        topics=post.topics or [],
        weight=8,
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