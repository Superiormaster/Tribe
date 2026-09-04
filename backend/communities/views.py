from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from random import shuffle
from rest_framework.views import APIView
from users.utils import get_user_avatar
from media.services.media import get_owned_ready_asset
from users.utils import redis_client
from .services import build_community_feed, serialize_community_feed
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from itertools import chain
from operator import attrgetter
from post.models import Repost, Share, Post
from feedback.models import Report
from post.serializers import RepostSerializer, PostSerializer, ShareSerializer
from .permissions import IsSuperUser
from .models import Community, Tribe, CommunityMembership, CommunityInvite, CommunityJoinRequest, CommunityMute, CommunityBan, TribeRequest
from .serializers import TribeRequestSerializer, CommunitySerializer, CommunityMuteSerializer, CommunityBanSerializer, InviteUserSerializer, CommunityInviteSerializer, TribeDetailSerializer, TribeSerializer, JoinedCommunitySerializer
from users.models import Star
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from notifications.createNotification import create_notification
from users.models import User
from django.db.models import Q, Case, When, Value, IntegerField, Count, F
from django.utils.timezone import now
from datetime import timedelta

class InvitePagination(PageNumberPagination):

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 20

class JoinedCommunityPagination(PageNumberPagination):
    page_size = 20

class FeedPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 30

def get_membership(user, community):
    return CommunityMembership.objects.filter(
        user=user,
        community=community
    ).first()

def is_moderator(user, community):
    role = get_user_role(user, community)

    return (
        user == community.owner or
        role in ["admin", "moderator"]
    )

def get_user_role(user, community):
    if user == community.owner:
        return "owner"

    membership = get_membership(user, community)
    if not membership:
        return "member"

    return membership.role

def can_manage_posts(user, community):
    role = get_user_role(user, community)

    return (
        user == community.owner or
        role in ("admin", "moderator")
    )

def can_moderate(actor, target, community):
    actor_role = get_user_role(actor, community)
    target_role = get_user_role(target, community)

    # Owner
    if actor == community.owner:
        return target != community.owner

    # Admin
    if actor_role == "admin":
        return target_role == "member"

    # Moderator
    if actor_role == "moderator":
        return target_role == "member"

    return False

def can_manage_settings(user, community):
    return user == community.owner or get_user_role(user, community) == "admin"

class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.all().order_by('-created_at')
    serializer_class = CommunitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):

      user = self.request.user
  
      cover_image_asset_id = (
          self.request.data.get(
              "cover_image_asset_id"
          )
      )
  
      intro_video_asset_id = (
          self.request.data.get(
              "intro_video_asset_id"
          )
      )
  
      tribe_id = self.request.data.get(
          "tribe"
      )
  
      cover_asset = get_owned_ready_asset(
          media_id=cover_image_asset_id,
          user=user,
          media_type="image",
      )
  
      intro_asset = get_owned_ready_asset(
          media_id=intro_video_asset_id,
          user=user,
          media_type="video",
      )
  
      community = serializer.save(
          owner=user,
          tribe_id=tribe_id,
          cover_image_asset=cover_asset,
          intro_video_asset=intro_asset,
      )
  
      update_fields = []
  
      if cover_asset:
          community.cover_image = (
              cover_asset.original_url
          )
          update_fields.append(
              "cover_image"
          )
  
      if intro_asset:
          community.intro_video = (
              intro_asset.original_url
          )
          update_fields.append(
              "intro_video"
          )
  
      if update_fields:
          community.save(
              update_fields=update_fields
          )
  
      CommunityMembership.objects.create(
          community=community,
          user=user,
          role="owner",
      )
  
    def perform_update(self, serializer):

      user = self.request.user
      instance = self.get_object()
  
      cover_image_asset_id = (
          self.request.data.get(
              "cover_image_asset_id"
          )
      )
  
      intro_video_asset_id = (
          self.request.data.get(
              "intro_video_asset_id"
          )
      )
  
      update_data = {}
  
      if (
          "cover_image_asset_id"
          in self.request.data
      ):
  
          cover_asset = get_owned_ready_asset(
              media_id=cover_image_asset_id,
              user=user,
              media_type="image",
          )
  
          update_data[
              "cover_image_asset"
          ] = cover_asset
  
          if cover_asset:
              update_data[
                  "cover_image"
              ] = cover_asset.original_url
  
      if (
          "intro_video_asset_id"
          in self.request.data
      ):
  
          intro_asset = get_owned_ready_asset(
              media_id=intro_video_asset_id,
              user=user,
              media_type="video",
          )
  
          update_data[
              "intro_video_asset"
          ] = intro_asset
  
          if intro_asset:
              update_data[
                  "intro_video"
              ] = intro_asset.original_url
  
      serializer.save(
          **update_data
      )

    @action(detail=True, methods=["post"])
    def report(self, request, pk=None):
        community = self.get_object()
    
        report, created = Report.objects.get_or_create(
            reporter=request.user,
            report_type="community",
            target_community=community,
            defaults={
                "reason": request.data.get("reason"),
                "details": request.data.get("details", "")
            }
        )
    
        if not created:
            return Response(
                {"message": "You already reported this message"},
                status=400
            )
    
        return Response({
            "success": True,
            "message": "Message reported successfully"
        })

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
    
        community = self.get_object()
    
        membership = CommunityMembership.objects.filter(
            user=request.user,
            community=community
        ).first()
    
        # ALREADY MEMBER
        if membership:
            return Response({
                "status": "already_joined"
            })
    
        ban = CommunityBan.objects.filter(
            community=community,
            user=request.user,
        ).first()
        
        if ban and ban.is_active:
            return Response(
                {"error": "You are banned"},
                status=403
            )

        existing_invite = CommunityInvite.objects.filter(
            community=community,
            receiver=request.user
        ).exists()
        
        if existing_invite:
            return Response({
                "status": "invited"
            })

        # APPROVAL REQUIRED
        if community.join_approval_required:
    
            request_obj, created = (
                CommunityJoinRequest.objects.get_or_create(
                    community=community,
                    user=request.user
                )
            )
  
            if not created:
              return Response({
                  "status": "already_requested"
              })
  
            recipients = {community.owner.id: community.owner}

            staff_members = CommunityMembership.objects.filter(
                community=community,
                role__in=["admin", "moderator"]
            ).exclude(
                user=community.owner
            )

            for member in staff_members:
                recipients[member.user.id] = member.user
            
            for recipient in recipients.values():
                create_notification(
                    type="join_request",
                    recipient=recipient,
                    actors=[request.user],
                    community=community
                )
    
            return Response({
                "status": "requested"
            })
    
        # NORMAL JOIN
        CommunityMembership.objects.create(
            user=request.user,
            community=community,
            role=(
                "owner"
                if request.user == community.owner
                else "member"
            )
        )
    
        return Response({
            "status": "joined"
        })

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
    
        community = self.get_object()
        q = request.GET.get("q", "").strip()
    
        muted_ids = CommunityMute.objects.filter(
            community=community,
        ).values_list("user_id", flat=True)
        
        banned_ids = CommunityBan.objects.filter(
            community=community
        ).values_list("user_id", flat=True)

        memberships = CommunityMembership.objects.filter(
            community=community,
        ).select_related("user")
    
        # 🔥 SEARCH FILTER (LIVE TYPING)
        if q:
            memberships = memberships.filter(
                user__username__icontains=q
            )
    
        data = []
    
        # OWNER FIRST (ALWAYS INCLUDED)
        if not q or community.owner.username.lower().find(q.lower()) != -1:
            data.append({
                "id": community.owner.id,
                "username": community.owner.username,
                "avatar": get_user_avatar(community.owner),
                "role": "owner",
            })
    
        for m in memberships:
    
            # skip owner duplicate
            if m.user_id == community.owner_id:
                continue
    
            data.append({
                "id": m.user.id,
                "username": m.user.username,
                "avatar": get_user_avatar(m.user),
                "role": m.role,
                "muted": m.user_id in muted_ids,
                "banned": m.user_id in banned_ids,
            })
    
        return Response(data)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        community = self.get_object()
    
        if request.user == community.owner:
          return Response(
              {"error": "Owner cannot leave"},
              status=400
          )

        CommunityMembership.objects.filter(
            user=request.user,
            community=community
        ).delete()
    
        return Response({"status": "left"})

    @action(detail=True, methods=["post"])
    def approve_request(self, request, pk=None):
    
        community = self.get_object()
    
        # ONLY OWNER / ADMIN / MODERATOR
        allowed = (
            request.user == community.owner
            or CommunityMembership.objects.filter(
                user=request.user,
                community=community,
                role__in=["admin", "moderator"]
            ).exists()
        )
    
        if not allowed:
            return Response(
                {"error": "Not allowed"},
                status=403
            )
    
        request_id = request.data.get("request_id")
    
        join_request = CommunityJoinRequest.objects.filter(
            id=request_id,
            community=community
        ).first()
    
        if not join_request:
            return Response(
                {"error": "Request not found"},
                status=404
            )
    
        CommunityMembership.objects.get_or_create(
            user=join_request.user,
            community=community,
            defaults={"role": "member"}
        )

        create_notification(
            type="join_approved",
            recipient=join_request.user,
            actors=[request.user],
            community=community
        )
    
        join_request.delete()
    
        return Response({
            "status": "approved"
        })

    @action(detail=True, methods=["post"])
    def reject_request(self, request, pk=None):
    
        community = self.get_object()
    
        allowed = (
            request.user == community.owner
            or CommunityMembership.objects.filter(
                user=request.user,
                community=community,
                role__in=["admin", "moderator"]
            ).exists()
        )
    
        if not allowed:
            return Response(
                {"error": "Not allowed"},
                status=403
            )
    
        request_id = request.data.get("request_id")
    
        join_request = CommunityJoinRequest.objects.filter(
            id=request_id,
            community=community
        ).first()
    
        if not join_request:
            return Response(
                {"error": "Request not found"},
                status=404
            )
  
        create_notification(
            type="join_rejected",
            recipient=join_request.user,
            actors=[request.user],
            community=community
        )
    
        join_request.delete()
    
        return Response({
            "status": "rejected"
        })

    @action(detail=True, methods=["get"])
    def join_requests(self, request, pk=None):
    
        community = self.get_object()
    
        allowed = (
            request.user == community.owner
            or CommunityMembership.objects.filter(
                user=request.user,
                community=community,
                role__in=["admin", "moderator"]
            ).exists()
        )
    
        if not allowed:
            return Response(
                {"error": "Not allowed"},
                status=403
            )
    
        requests = (
            CommunityJoinRequest.objects
            .filter(community=community)
            .select_related("user")
            .order_by("-created_at")
        )
    
        paginator = PageNumberPagination()
        paginator.page_size = 20
    
        result = paginator.paginate_queryset(
            requests,
            request
        )
    
        data = [
            {
                "id": r.id,
    
                "created_at": r.created_at,
    
                "user": {
                    "id": r.user.id,
                    "username": r.user.username,
                    "avatar": get_user_avatar(r.user)
                }
            }
            for r in result
        ]
    
        return paginator.get_paginated_response(data)

    @action(detail=True, methods=["get"])
    def info(self, request, pk=None):
        community = self.get_object()
    
        staff = (
            CommunityMembership.objects
            .filter(
                community=community,
                role__in=["admin", "moderator"],
            )
            .select_related("user")
        )
    
        admins = []
        moderators = []
    
        for membership in staff:
            person = {
                "id": membership.user.id,
                "username": membership.user.username,
                "avatar": get_user_avatar(membership.user),
            }
    
            if membership.role == "admin":
                admins.append(person)
    
            elif membership.role == "moderator":
                moderators.append(person)
    
        return Response({
            "id": community.id,
            "name": community.name,
            "description": community.description,
            "rules": community.rules or "",
            "website": community.website,
    
            "cover_image_url": (
                community.cover_image_asset.original_url
                if community.cover_image_asset
                else community.cover_image
            ),
    
            "intro_video_url": (
                community.intro_video_asset.original_url
                if community.intro_video_asset
                else community.intro_video
            ),
    
            "owner": {
                "id": community.owner.id,
                "username": community.owner.username,
                "avatar": get_user_avatar(community.owner),
            },
    
            "admins": admins,
    
            "moderators": moderators,
    
            "members_count": (
                CommunityMembership.objects
                .filter(community=community)
                .exclude(
                    user_id__in=CommunityBan.objects.filter(
                        community=community
                    ).values_list("user_id", flat=True)
                )
                .count()
            ),
    
            "my_role": get_user_role(
                request.user,
                community
            ),
    
            "joined": CommunityMembership.objects.filter(
                community=community,
                user=request.user,
            ).exclude(
                user_id__in=CommunityBan.objects.filter(
                    community=community
                ).values_list("user_id", flat=True)
            ).exists(),
    
            "permissions": {
                "allow_reels": (
                    community.tribe.allow_reels
                    if community.tribe and not community.override_reels
                    else False
                ),
    
                "allow_videos": (
                    community.allow_videos
                    if community.override_reels
                    else not (
                        community.tribe
                        and community.tribe.allow_reels
                    )
                ),
            },
        })

    @action(detail=True, methods=["get", "patch"], url_path="settings")
    def community_settings(self, request, pk=None):
        community = self.get_object()

        # GET SETTINGS
        if request.method == "GET":
            memberships = CommunityMembership.objects.filter(community=community).select_related("user")
            banned_ids = CommunityBan.objects.filter(
                community=community
            ).values_list("user_id", flat=True)
            memberships = memberships.exclude(
                user_id__in=banned_ids
            )

            moderators = memberships.filter(role="moderator")[:5]
            admins = memberships.filter(role="admin")

            return Response({
                "id": community.id,
                "name": community.name,
                "description": community.description,
                "website": community.website,
                "rules": community.rules or "",
            
                # New MediaAsset system
                "cover_image_url": (
                    community.cover_image_asset.original_url
                    if community.cover_image_asset
                    else community.cover_image
                ),
            
                "intro_video_url": (
                    community.intro_video_asset.original_url
                    if community.intro_video_asset
                    else community.intro_video
                ),
            
                "cover_image_asset_id": (
                    community.cover_image_asset.media_id
                    if community.cover_image_asset
                    else None
                ),
                
                "intro_video_asset_id": (
                    community.intro_video_asset.media_id
                    if community.intro_video_asset
                    else None
                ),
                "require_post_approval": community.require_post_approval,
                "join_approval_required": community.join_approval_required,
                "owner": {
                    "id": community.owner.id,
                    "username": community.owner.username,
                },
                "moderators": [
                    {"id": m.user.id, "username": m.user.username}
                    for m in moderators
                ],
                "admin": (
                    {
                        "id": admins.first().user.id,
                        "username": admins.first().user.username,
                    } if admins.exists()
                    else {
                        "id": community.owner.id,
                        "username": community.owner.username,
                    }
                ),
                "permissions": {
                    "allow_reels": (
                        community.tribe.allow_reels
                        if community.tribe and not community.override_reels
                        else False
                    ),
                    "allow_videos": (
                        community.allow_videos
                        if community.override_reels
                        else not (
                            community.tribe and community.tribe.allow_reels
                        )
                    ),
                },
            })

        # UPDATE SETTINGS
        if request.method == "PATCH":
        
            if (
                request.user != community.owner
                and not CommunityMembership.objects.filter(
                    user=request.user,
                    community=community,
                    role="admin",
                ).exists()
            ):
                return Response(
                    {"error": "Not allowed"},
                    status=403,
                )
        
            serializer = CommunitySerializer(
                community,
                data=request.data,
                partial=True,
                context={"request": request},
            )
        
            serializer.is_valid(raise_exception=True)
            serializer.save()
        
            community.refresh_from_db()
        
            return Response({
                "status": "updated",
        
                "id": community.id,
                "rules": community.rules or "",
                "website": community.website or "",
        
                "cover_image_url": (
                    community.cover_image_asset.original_url
                    if community.cover_image_asset
                    else community.cover_image
                ),
        
                "intro_video_url": (
                    community.intro_video_asset.original_url
                    if community.intro_video_asset
                    else community.intro_video
                ),
        
                "cover_image_asset_id": (
                    community.cover_image_asset.media_id
                    if community.cover_image_asset
                    else None
                ),
                
                "intro_video_asset_id": (
                    community.intro_video_asset.media_id
                    if community.intro_video_asset
                    else None
                ),
        
                "require_post_approval":
                    community.require_post_approval,
        
                "join_approval_required":
                    community.join_approval_required,
            })
  
    @action(detail=True, methods=["get"])
    def feed(self, request, pk=None):
    
        community = self.get_object()
        user = request.user
    
        joined_communities = CommunityMembership.objects.filter(
            user=user
        ).values_list("community_id", flat=True)
    
        starred_ids = set(
            Star.objects.filter(star=user).values_list("starred_user_id", flat=True)
        )
    
        two_weeks_ago = (
            timezone.now() -
            timedelta(days=14)
        )
    
        items = build_community_feed(
            community=community,
            user=user,
            joined_communities=joined_communities,
            starred_ids=starred_ids,
            two_weeks_ago=two_weeks_ago
        )
    
        data = serialize_community_feed(
            items,
            request,
            starred_ids
        )
    
        paginator = FeedPagination()
    
        result_page = paginator.paginate_queryset(
            data,
            request
        )
    
        return paginator.get_paginated_response(
            result_page
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="refresh-feed"
    )
    def refresh_feed(self, request, pk=None):
    
        community = self.get_object()
        user = request.user
  
        key = f"feed_seed:{user.id}"
    
        redis_client.delete(key)
  
        seed = session_seed(user)
  
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
    
        two_weeks_ago = (
            timezone.now() -
            timedelta(days=14)
        )
    
        items = build_community_feed(
            community=community,
            user=user,
            joined_communities=joined_communities,
            starred_ids=starred_ids,
            two_weeks_ago=two_weeks_ago,
        )
  
        data = serialize_community_feed(
            items,
            request,
            starred_ids
        )
  
        paginator = FeedPagination()
    
        result_page = paginator.paginate_queryset(
            data,
            request
        )
    
        response = paginator.get_paginated_response(
            result_page
        )
    
        response.data["refreshed"] = True
        response.data["seed"] = seed
    
        return response

    @action(detail=True, methods=["get"])
    def pending_posts(self, request, pk=None):
    
        community = self.get_object()
        user = request.user
    
        is_mod = is_moderator(user, community)
  
        if is_mod:
            posts = Post.objects.filter(
                community=community,
                is_approved=False,
                is_rejected=False,
                is_deleted=False,
            ).select_related(
                "user",
                "community",
            ).prefetch_related(
                "media_files__asset"
            )
        else:
            posts = Post.objects.filter(
                community=community,
                user=user,
                is_approved=False,
                is_rejected=False,
                is_deleted=False,
            ).select_related(
                "user",
                "community",
            ).prefetch_related(
                "media_files__asset"
            )
    
        if is_mod:
            shares = Share.objects.filter(
                community=community,
                is_deleted=False,
                status="pending",
                post__is_deleted=False,
            ).select_related(
                "user",
                "community",
                "post",
                "post__user",
            ).prefetch_related(
                "post__media_files__asset"
            )
        else:
            shares = Share.objects.filter(
                community=community,
                user=user,
                is_deleted=False,
                status="pending",
                post__is_deleted=False,
            ).select_related(
                "user",
                "community",
                "post",
                "post__user",
            ).prefetch_related(
                "post__media_files__asset"
            )
  
        items = []
    
        for post in posts:
            items.append({
                "type": "post",
                "data": post,
                "created_at": post.created_at,
            })
    
        for share in shares:
            items.append({
                "type": "share",
                "data": share,
                "created_at": share.created_at,
            })
  
        items.sort(
            key=lambda item: (
                item["created_at"].timestamp()
                if item["created_at"]
                else 0
            ),
            reverse=True,
        )
  
        paginator = FeedPagination()
    
        result_page = paginator.paginate_queryset(
            items,
            request
        )
  
        serialized = []
    
        for item in result_page:
    
            if item["type"] == "post":
    
                data = PostSerializer(
                    item["data"],
                    context={
                        "request": request
                    }
                ).data
    
                data["type"] = "post"
    
                serialized.append(data)
    
            elif item["type"] == "share":
    
                data = ShareSerializer(
                    item["data"],
                    context={
                        "request": request
                    }
                ).data
    
                data["type"] = "share"
    
                serialized.append(data)
    
        return paginator.get_paginated_response(
            serialized
        )
 
    @action(detail=True, methods=["get"])
    def approved_posts(self, request, pk=None):
    
        community = self.get_object()
    
        if is_moderator(request.user, community):
    
            posts = (
                Post.objects
                .filter(
                    community=community,
                    is_approved=True,
                    is_deleted=False,
                )
                .select_related(
                    "user",
                    "community",
                )
            )
    
            reposts = (
                Repost.objects
                .filter(
                    community=community,
                    post__is_deleted=False,
                    post__is_approved=True,
                )
                .select_related(
                    "user",
                    "community",
                    "post",
                    "post__user",
                )
            )
    
            shares = (
                Share.objects
                .filter(
                    community=community,
                    is_deleted=False,
                    status="approved",
                    post__is_deleted=False,
                )
                .select_related(
                    "user",
                    "community",
                    "post",
                    "post__user",
                )
            )
    
        else:
    
            posts = (
                Post.objects
                .filter(
                    community=community,
                    user=request.user,
                    is_approved=True,
                    is_deleted=False,
                )
                .select_related(
                    "user",
                    "community",
                )
            )
    
            reposts = (
                Repost.objects
                .filter(
                    community=community,
                    user=request.user,
                    post__is_deleted=False,
                    post__is_approved=True,
                )
                .select_related(
                    "user",
                    "community",
                    "post",
                    "post__user",
                )
            )
    
            shares = (
                Share.objects
                .filter(
                    community=community,
                    user=request.user,
                    is_deleted=False,
                    status="approved",
                    post__is_deleted=False,
                )
                .select_related(
                    "user",
                    "community",
                    "post",
                    "post__user",
                )
            )
    
        items = []
    
        for post in posts:
    
            items.append({
                "type": "post",
                "data": post,
                "created_at": post.created_at,
            })
    
        for repost in reposts:
    
            items.append({
                "type": "repost",
                "data": repost,
                "created_at": repost.created_at,
            })
    
        for share in shares:
    
            items.append({
                "type": "share",
                "data": share,
                "created_at": share.created_at,
            })
    
        items.sort(
            key=lambda item: (
                getattr(
                    item["data"],
                    "community_pinned",
                    False
                ),
    
                -(
                    getattr(
                        item["data"],
                        "community_pin_order",
                        0
                    ) or 0
                ),
    
                item["created_at"].timestamp()
                if item["created_at"]
                else 0,
            ),
            reverse=True
        )
    
        paginator = FeedPagination()
    
        result_page = paginator.paginate_queryset(
            items,
            request
        )
    
        serialized_data = []
    
        for item in result_page:
    
            obj = item["data"]
            item_type = item["type"]
    
            if item_type == "post":
    
                data = PostSerializer(
                    obj,
                    context={"request": request}
                ).data
    
            elif item_type == "repost":
    
                data = RepostSerializer(
                    obj,
                    context={"request": request}
                ).data
    
            elif item_type == "share":
    
                data = ShareSerializer(
                    obj,
                    context={"request": request}
                ).data
    
            else:
                continue
    
            data["type"] = item_type
            data["id"] = obj.id
    
            serialized_data.append(data)
    
        return paginator.get_paginated_response(
            serialized_data
        )

    @action(detail=True, methods=["get"])
    def rejected_posts(self, request, pk=None):
        community = self.get_object()
    
        if is_moderator(request.user, community):
    
            posts = (
                Post.objects
                .filter(
                    community=community,
                    is_rejected=True,
                    is_deleted=False,
                )
                .select_related(
                    "user",
                    "community",
                )
            )
    
            shares = (
                Share.objects
                .filter(
                    community=community,
                    is_deleted=False,
                    status="rejected",
                    post__is_deleted=False,
                )
                .select_related(
                    "user",
                    "community",
                    "post",
                    "post__user",
                )
            )
    
        else:
    
            posts = (
                Post.objects
                .filter(
                    community=community,
                    user=request.user,
                    is_rejected=True,
                    is_deleted=False,
                )
                .select_related(
                    "user",
                    "community",
                )
            )
    
            shares = (
                Share.objects
                .filter(
                    community=community,
                    user=request.user,
                    is_deleted=False,
                    status="rejected",
                    post__is_deleted=False,
                )
                .select_related(
                    "user",
                    "community",
                    "post",
                    "post__user",
                )
            )
    
        items = []
    
        for post in posts:
            items.append({
                "type": "post",
                "data": post,
                "created_at": post.created_at,
            })
    
        for share in shares:
            items.append({
                "type": "share",
                "data": share,
                "created_at": share.created_at,
            })
    
        items.sort(
            key=lambda item: (
                item["created_at"].timestamp()
                if item["created_at"]
                else 0
            ),
            reverse=True,
        )
    
        paginator = FeedPagination()
    
        result_page = paginator.paginate_queryset(
            items,
            request
        )
   
        serialized_data = []
    
        for item in result_page:
    
            if item["type"] == "post":
    
                data = PostSerializer(
                    item["data"],
                    context={"request": request}
                ).data
    
            elif item["type"] == "share":
    
                data = ShareSerializer(
                    item["data"],
                    context={"request": request}
                ).data
    
            else:
                continue
    
            # Important for frontend
            data["type"] = item["type"]
            data["id"] = item["data"].id
    
            serialized_data.append(data)
    
        return paginator.get_paginated_response(
            serialized_data
        )

    @action(detail=True, methods=["post"])
    def add_moderator(self, request, pk=None):
        community = self.get_object()
    
        if request.user != community.owner:
            return Response({"error": "Only owner"}, status=403)
    
        current_mods = CommunityMembership.objects.filter(
            community=community,
            role="moderator"
        ).count()
    
        if current_mods >= 5:
            return Response(
                {"error": "Max 5 moderators allowed"},
                status=400
            )

        membership, _ = CommunityMembership.objects.get_or_create(
            community=community,
            user_id=request.data["user_id"]
        )
    
        membership.role = "moderator"
        membership.save()
  
        create_notification(
            type="moderator_added",
            recipient=membership.user,
            actors=[request.user],
            community=community
        )
    
        return Response({"status": "moderator_added"})

    @action(detail=True, methods=["post"])
    def remove_moderator(self, request, pk=None):
        community = self.get_object()
    
        if request.user != community.owner:
            return Response({"error": "Only owner"}, status=403)
    
        membership = CommunityMembership.objects.get(
            community=community,
            user_id=request.data["user_id"]
        )
    
        membership.role = "member"
        membership.save()

        create_notification(
            type="role_removed",
            recipient=membership.user,
            actors=[request.user],
            community=community
        )
    
        return Response({"status": "moderator_removed"})

    @action(detail=True, methods=["post"])
    def add_admin(self, request, pk=None):
        community = self.get_object()
    
        if request.user != community.owner:
            return Response({"error": "Only owner"}, status=403)
    
        membership, _ = CommunityMembership.objects.get_or_create(
            community=community,
            user_id=request.data["user_id"]
        )
    
        membership.role = "admin"
        membership.save()
  
        create_notification(
            type="admin_added",
            recipient=membership.user,
            actors=[request.user],
            community=community
        )
    
        return Response({"status": "admin_added"})

    @action(detail=True, methods=["post"])
    def remove_admin(self, request, pk=None):
        community = self.get_object()
    
        if request.user != community.owner:
            return Response({"error": "Only owner"}, status=403)
    
        membership = CommunityMembership.objects.get(
            community=community,
            user_id=request.data["user_id"]
        )
    
        membership.role = "member"
        membership.save()

        create_notification(
            type="role_removed",
            recipient=membership.user,
            actors=[request.user],
            community=community
        )
    
        return Response({"status": "admin_removed"})

    @action(detail=False, methods=["post"])
    def bulk_delete(self, request):
        items = request.data.get("items", [])
        community_id = request.data.get("community_id")
    
        if not isinstance(items, list):
            return Response(
                {"error": "Invalid items"},
                status=400
            )
    
        if not community_id:
            return Response(
                {"error": "community_id is required"},
                status=400
            )
    
        community = Community.objects.filter(
            id=community_id
        ).first()
    
        if not community:
            return Response(
                {"error": "Community not found"},
                status=404
            )
    
        user = request.user
    
        # Must be owner/admin/moderator to bulk-delete
        if not can_manage_posts(user, community):
            return Response(
                {"error": "You do not have permission to delete content"},
                status=403
            )
    
        deleted_posts = []
        deleted_shares = []
        deleted_reposts = []
    
        for item in items:
            item_type = item.get("type")
            item_id = item.get("id")
    
            if not item_type or not item_id:
                continue
    
            # -------------------------
            # POST
            # -------------------------
            if item_type == "post":
    
                post = Post.objects.filter(
                    id=item_id,
                    community=community,
                    is_deleted=False,
                ).select_related("user").first()
    
                if not post:
                    continue
    
                # Owner of the post can delete it.
                # Admin/moderator can also delete it.
                if (
                    post.user != user
                    and not can_manage_posts(user, community)
                ):
                    continue
    
                post.is_deleted = True
                post.save(update_fields=["is_deleted"])
    
                deleted_posts.append(post.id)
    
                # Notify when someone other than the author deletes it
                if post.user_id != user.id:
    
                    create_notification(
                        type="post_deleted_by_admin",
                        recipient=post.user,
                        actors=[user],
                        community=community,
                        post=post,
                    )
    
            # -------------------------
            # SHARE
            # -------------------------
            elif item_type == "share":
    
                share = Share.objects.filter(
                    id=item_id,
                    community=community,
                    is_deleted=False,
                ).select_related(
                    "user",
                    "post",
                ).first()
    
                if not share:
                    continue
    
                if (
                    share.user != user
                    and not can_manage_posts(user, community)
                ):
                    continue
    
                share.is_deleted = True
                share.save(
                    update_fields=["is_deleted"]
                )
    
                deleted_shares.append(share.id)
    
                if share.user_id != user.id:
    
                    create_notification(
                        type="post_deleted_by_admin",
                        recipient=share.user,
                        actors=[user],
                        community=community,
                        post=share.post,
                    )
    
            # -------------------------
            # REPOST
            # -------------------------
            elif item_type == "repost":
    
                repost = Repost.objects.filter(
                    id=item_id,
                    community=community,
                    is_deleted=False,
                ).select_related(
                    "user",
                    "post",
                ).first()
    
                if not repost:
                    continue
    
                if (
                    repost.user != user
                    and not can_manage_posts(user, community)
                ):
                    continue
    
                repost.is_deleted = True
                repost.save(
                    update_fields=["is_deleted"]
                )
    
                deleted_reposts.append(repost.id)
    
                if repost.user_id != user.id:
    
                    create_notification(
                        type="post_deleted_by_admin",
                        recipient=repost.user,
                        actors=[user],
                        community=community,
                        post=repost.post,
                    )
    
        return Response({
            "success": True,
            "deleted": {
                "posts": deleted_posts,
                "shares": deleted_shares,
                "reposts": deleted_reposts,
            }
        })
  
    @action(
        detail=False,
        methods=["post"]
    )
    def moderate(self, request):
    
        user = request.user
    
        items = request.data.get("items", [])
        action = request.data.get("action")
    
        if action not in ["approve", "reject"]:
            return Response(
                {
                    "error": "Invalid moderation action"
                },
                status=400
            )
    
        if not items:
            return Response(
                {
                    "error": "No items supplied"
                },
                status=400
            )
    
        approved_posts = []
        rejected_posts = []
    
        approved_shares = []
        rejected_shares = []
    
        for item in items:
    
            item_type = item.get("type")
            item_id = item.get("id")
    
            if not item_type or not item_id:
                continue
   
            if item_type == "post":
    
                post = (
                    Post.objects
                    .filter(
                        id=item_id,
                        is_deleted=False,
                    )
                    .select_related("community", "user")
                    .first()
                )
    
                if not post:
                    continue
    
                if not can_manage_posts(
                    user,
                    post.community
                ):
                    continue
    
                if action == "approve":
    
                    post.is_approved = True
                    post.is_rejected = False
    
                    post.save(
                        update_fields=[
                            "is_approved",
                            "is_rejected",
                        ]
                    )
    
                    create_notification(
                        type="post_approved",
                        recipient=post.user,
                        actors=[user],
                        community=post.community,
                        post=post
                    )
    
                    approved_posts.append(post.id)
    
                else:
    
                    post.is_rejected = True
                    post.is_approved = False
    
                    post.save(
                        update_fields=[
                            "is_rejected",
                            "is_approved",
                        ]
                    )
    
                    create_notification(
                        type="post_rejected",
                        recipient=post.user,
                        actors=[user],
                        community=post.community,
                        post=post
                    )
    
                    rejected_posts.append(post.id)
    
            elif item_type == "share":
    
                share = (
                    Share.objects
                    .filter(
                        id=item_id,
                        is_deleted=False,
                        status="pending",
                    )
                    .select_related(
                        "community",
                        "user",
                        "post",
                    )
                    .first()
                )
    
                if not share:
                    continue
    
                if not can_manage_posts(
                    user,
                    share.community
                ):
                    continue
    
                if action == "approve":
    
                    share.status = "approved"
    
                    share.save(
                        update_fields=[
                            "status"
                        ]
                    )
    
                    create_notification(
                        type="post_approved",
                        recipient=share.user,
                        actors=[user],
                        community=share.community,
                        post=share.post
                    )
    
                    approved_shares.append(
                        share.id
                    )
    
                else:
    
                    share.status = "rejected"
    
                    share.save(
                        update_fields=[
                            "status"
                        ]
                    )
    
                    create_notification(
                        type="post_rejected",
                        recipient=share.user,
                        actors=[user],
                        community=share.community,
                        post=share.post
                    )
    
                    rejected_shares.append(
                        share.id
                    )
    
        return Response({
            "success": True,
            "action": action,
            "approved": {
                "posts": approved_posts,
                "shares": approved_shares,
            },
            "rejected": {
                "posts": rejected_posts,
                "shares": rejected_shares,
            },
        })

    def get_permissions(self):
        if self.action in ['destroy']:
            return [IsAuthenticated(), IsOwner()]
        return [IsAuthenticated()]

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mute_community_user(request, community_id):
    community = get_object_or_404(
        Community,
        id=community_id,
    )
    
    target = get_object_or_404(
        User,
        id=request.data["user"],
    )
    
    if not can_moderate_target(
        request.user,
        target,
        community,
    ):
        return Response(
            {"error": "Permission denied."},
            status=403,
        )

    serializer = CommunityMuteSerializer(
        data=request.data
    )

    serializer.is_valid(raise_exception=True)

    mute = serializer.save(
        muted_by=request.user
    )

    CommunityAuditLog.objects.create(
        community=mute.community,
        actor=request.user,
        target_user=mute.user,
        action="mute",
        details={
            "reason": mute.reason,
            "muted_until": mute.muted_until.isoformat(),
        },
    )

    return Response(
        CommunityMuteSerializer(mute).data
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unmute_community_user(request, community_id):
    community = get_object_or_404(
        Community,
        id=community_id,
    )

    target = get_object_or_404(
        User,
        id=request.data.get("user"),
    )
  
    if not can_moderate_target(
        request.user,
        target,
        community,
    ):
        return Response(
            {"error": "Permission denied."},
            status=403,
        )

    mute = CommunityMute.objects.filter(
        community=community,
        user=user,
    ).first()

    if not mute:
        return Response(
            {"detail": "User is not muted."},
            status=404,
        )

    mute.delete()

    CommunityAuditLog.objects.create(
        community=community,
        actor=request.user,
        target_user=user,
        action="mute",
        details={
            "action": "unmute",
        },
    )

    return Response({
        "success": True,
        "message": "User unmuted successfully.",
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ban_community_user(request, community_id):
    community = get_object_or_404(
        Community,
        id=community_id,
    )
    
    target = get_object_or_404(
        User,
        id=request.data["user"],
    )
    
    if not can_moderate_target(
        request.user,
        target,
        community,
    ):
        return Response(
            {"error": "Permission denied."},
            status=403,
        )

    serializer = CommunityBanSerializer(
        data=request.data,
    )

    serializer.is_valid(raise_exception=True)

    ban = serializer.save(
        banned_by=request.user,
    )

    CommunityMembership.objects.filter(
        community=ban.community,
        user=ban.user,
    ).delete()

    CommunityAuditLog.objects.create(
        community=ban.community,
        actor=request.user,
        target_user=ban.user,
        action="ban",
        details={
            "reason": ban.reason,
            "permanent": ban.permanent,
            "banned_until": (
                ban.banned_until.isoformat()
                if ban.banned_until
                else None
            ),
        },
    )

    create_notification(
        type="community_ban",
        recipient=ban.user,
        actors=[request.user],
        community=ban.community,
    )

    return Response(
        CommunityBanSerializer(ban).data
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unban_community_user(request, community_id):
    community = get_object_or_404(
        Community,
        id=community_id,
    )

    target = get_object_or_404(
        User,
        id=request.data.get("user"),
    )
  
    if not can_moderate_target(
        request.user,
        target,
        community,
    ):
        return Response(
            {"error": "Permission denied."},
            status=403,
        )

    ban = CommunityBan.objects.filter(
        community=community,
        user=user,
    ).first()

    if not ban:
        return Response(
            {"detail": "User is not banned."},
            status=404,
        )

    ban.delete()

    CommunityAuditLog.objects.create(
        community=community,
        actor=request.user,
        target_user=user,
        action="ban",
        details={
            "action": "unban",
        },
    )

    create_notification(
        type="community_unban",
        recipient=user,
        actors=[request.user],
        community=community,
    )

    return Response({
        "success": True,
        "message": "User unbanned successfully.",
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_community_user(request, community_id):
    community = get_object_or_404(
        Community,
        id=community_id,
    )

    target = get_object_or_404(
        User,
        id=request.data["user"],
    )
    
    if not can_moderate(
        request.user,
        target,
        community,
    ):
        return Response(
            {"error": "Permission denied."},
            status=403,
        )

    membership = CommunityMembership.objects.filter(
        community=community,
        user=user,
    ).first()

    if not membership:
        return Response(
            {"detail": "User is not a member."},
            status=404,
        )

    membership.delete()

    CommunityAuditLog.objects.create(
        community=community,
        actor=request.user,
        target_user=user,
        action="role_update",
        details={
            "action": "remove_member",
        },
    )

    create_notification(
        type="community_removed",
        recipient=user,
        actors=[request.user],
        community=community,
    )

    return Response({
        "success": True,
        "message": "User removed successfully.",
    })

class TribeViewSet(viewsets.ModelViewSet):
    queryset = Tribe.objects.all()
    serializer_class = TribeSerializer
    permission_classes = [IsSuperUser]

class PublicTribeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tribe.objects.all()
    serializer_class = TribeSerializer

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TribeDetailSerializer
        return TribeSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

class SuggestedCommunityView(APIView):
    def get(self, request, community_id):
        user = request.user

        community = Community.objects.get(id=community_id)

        joined_ids = CommunityMembership.objects.filter(
            user=user
        ).values_list("community_id", flat=True)

        invited_ids = CommunityInvite.objects.filter(
            receiver=user
        ).values_list("community_id", flat=True)

        communities = (
            Community.objects
            .filter(tribe=community.tribe)
            .exclude(id__in=joined_ids)
            .exclude(id__in=invited_ids)   # 🔥 THIS IS THE FIX
            .exclude(id=community.id)
            .annotate(member_count=Count("memberships"))
            .order_by("-member_count")[:5]
        )

        serializer = CommunitySerializer(
            communities,
            many=True,
            context={"request": request}
        )

        return Response(serializer.data)

class ExploreCommunitiesView(APIView):
    def get(self, request):
        communities = list(
            Community.objects
            .annotate(member_count=Count("memberships"))
            .order_by("-member_count")[:50]
        )

        shuffle(communities)

        serializer = CommunitySerializer(
            communities[:5],
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def invite_users(request, community_id):

    community = get_object_or_404(
        Community,
        id=community_id
    )

    # 🔥 SECURITY CHECK
    is_owner = community.owner == request.user

    is_staff_member = CommunityMembership.objects.filter(
        community=community,
        user=request.user,
        role__in=["admin", "moderator"]
    ).exists()

    if not is_owner and not is_staff_member:
        return Response(
            {"error": "Permission denied"},
            status=403
        )

    q = request.GET.get("q", "").strip()

    # 🔥 EXCLUDE EXISTING MEMBERS
    member_ids = CommunityMembership.objects.filter(
        community=community
    ).values_list("user_id", flat=True)

    # 🔥 EXCLUDE ALREADY INVITED USERS
    invited_ids = CommunityInvite.objects.filter(
        community=community
    ).values_list("receiver_id", flat=True)

    users = User.objects.exclude(
        id__in=member_ids
    )

    if q:
        users = users.filter(
            username__icontains=q
        )

    """
    🔥 PRIORITY SYSTEM

    Replace this with your own:
    followers
    stars
    friends
    connections
    etc
    """

    starred_ids = []
    connected_ids = []

    users = users.annotate(

        priority=Case(

            When(
                id__in=starred_ids,
                then=Value(3)
            ),

            When(
                id__in=connected_ids,
                then=Value(2)
            ),

            default=Value(1),
            output_field=IntegerField()
        )

    ).order_by(
        "-priority",
        "username"
    )

    paginator = InvitePagination()

    paginated_users = paginator.paginate_queryset(
        users,
        request
    )

    serializer = InviteUserSerializer(
        paginated_users,
        many=True,
        context={
            "invited_ids": invited_ids
        }
    )

    return paginator.get_paginated_response(
        serializer.data
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_community_invite(request, community_id):

    community = get_object_or_404(
        Community,
        id=community_id
    )

    receiver_id = request.data.get("user_id")

    receiver = get_object_or_404(
        User,
        id=receiver_id
    )
    
    if receiver == request.user:
      return Response(
          {"error": "You cannot invite yourself"},
          status=400
      )

    # 🔥 SECURITY CHECK
    is_owner = community.owner == request.user

    is_staff_member = CommunityMembership.objects.filter(
        community=community,
        user=request.user,
        role__in=["admin", "moderator"]
    ).exists()

    if not is_owner and not is_staff_member:
        return Response(
            {"error": "Permission denied"},
            status=403
        )

    # 🔥 DAILY LIMIT
    today = now() - timedelta(hours=24)

    count = CommunityInvite.objects.filter(
        sender=request.user,
        community=community,
        created_at__gte=today
    ).count()

    if count >= 50:
        return Response(
            {
                "error": "Daily invite limit reached"
            },
            status=400
        )

    ban = CommunityBan.objects.filter(
        community=community,
        user=receiver
    ).first()
    
    if ban and ban.is_active:
        return Response(
            {"error": "User is banned"},
            status=400
        )
  
    # 🔥 ALREADY MEMBER
    membership = CommunityMembership.objects.filter(
        community=community,
        user=receiver
    ).first()
    
    if membership:
        return Response(
            {"error": "Already a member"},
            status=400
        )

    # remove pending request
    CommunityJoinRequest.objects.filter(
        community=community,
        user=receiver
    ).delete()
  
    # 🔥 CREATE INVITE
    invite, created = CommunityInvite.objects.get_or_create(
        sender=request.user,
        receiver=receiver,
        community=community
    )

    if not created:
        return Response(
            {"error": "Already invited"},
            status=400
        )

    create_notification(
        type="invite",
        recipient=receiver,
        actors=[request.user],
        community=community
    )

    return Response({
        "message": "Invitation sent"
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_community_invite(request, invite_id):

    invite = get_object_or_404(
        CommunityInvite,
        id=invite_id,
        receiver=request.user
    )

    community = invite.community

    # 🔥 ALREADY MEMBER CHECK
    already_member = CommunityMembership.objects.filter(
        community=community,
        user=request.user
    ).exists()

    if already_member:

        invite.delete()

        return Response({
            "message": "Already a member"
        })

    # 🔥 CREATE MEMBERSHIP
    CommunityMembership.objects.create(
        community=community,
        user=request.user,
        role="member"
    )

    # 🔥 OWNER NOTIFICATION
    create_notification(
        type="invite_accept",
        recipient=community.owner,
        actors=[request.user],
        community=community
    )

    # 🔥 STAFF NOTIFICATIONS
    staff_members = CommunityMembership.objects.filter(
        community=community,
        role__in=["admin", "moderator"]
    ).exclude(
        user=request.user
    )

    for member in staff_members:

        create_notification(
            type="invite_accept",
            recipient=member.user,
            actors=[request.user],
            community=community
        )

    # 🔥 DELETE INVITE
    invite.delete()

    return Response({
        "message": "Joined community"
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def decline_community_invite(request, invite_id):

    invite = get_object_or_404(
        CommunityInvite,
        id=invite_id,
        receiver=request.user
    )

    invite.delete()

    return Response({
        "message": "Invite declined"
    })

class InvitePagination(PageNumberPagination):
    page_size = 20

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_my_invites(request):

    invites = CommunityInvite.objects.filter(
        receiver=request.user
    ).select_related(
        "sender",
        "community"
    ).order_by("-created_at")

    paginator = InvitePagination()
    paginated = paginator.paginate_queryset(invites, request)
    serializer = CommunityInviteSerializer(paginated, many=True)
    return paginator.get_paginated_response(serializer.data)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tribe_requests(request):

    if request.method == "POST":
        serializer = TribeRequestSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        tribe_request = serializer.save()

        return Response(
            TribeRequestSerializer(tribe_request).data,
            status=status.HTTP_201_CREATED,
        )

    # GET
    search = request.GET.get("search", "").strip()
    status_filter = request.GET.get("status")

    qs = TribeRequest.objects.filter(
        creator=request.user
    )

    if status_filter and status_filter != "all":
        qs = qs.filter(status=status_filter)

    if search:
        qs = qs.filter(name__icontains=search)

    paginator = PageNumberPagination()
    paginator.page_size = 20

    page = paginator.paginate_queryset(qs, request)

    serializer = TribeRequestSerializer(
        page,
        many=True
    )

    return paginator.get_paginated_response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def tribe_request_detail(request, pk):
    try:
        tribe_request = TribeRequest.objects.get(
            id=pk,
            creator=request.user
        )
    except TribeRequest.DoesNotExist:
        return Response(
            {"detail": "Not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response(
        TribeRequestSerializer(tribe_request).data
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def joined_communities(request):
    queryset = (
        CommunityMembership.objects
        .filter(user=request.user)
        .select_related("community")
        .order_by("-joined_at")
    )

    paginator = JoinedCommunityPagination()
    page = paginator.paginate_queryset(
        queryset,
        request
    )

    serializer = JoinedCommunitySerializer(
        page,
        many=True,
    )

    return paginator.get_paginated_response(
        serializer.data
    )

class CommunityDeleteView(APIView):
    def delete(self, request, pk):
        try:
            community = Community.objects.get(pk=pk)
        except Community.DoesNotExist:
            return Response(
                {"detail": "Community not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user

        if (
            community.owner != user
            and user.role not in ["admin", "superadmin"]
        ):
            return Response(
                {
                    "detail": "You don't have permission to delete this community."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        community.delete()

        return Response(
            {"detail": "Community deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )