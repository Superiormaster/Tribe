from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from users.utils import redis_client
from .services import build_community_feed, serialize_community_feed
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from itertools import chain
from operator import attrgetter
from post.models import Repost, Post
from feedback.models import Report
from post.serializers import RepostSerializer, PostSerializer
from .permissions import IsSuperUser
from .models import Community, Tribe, CommunityMembership, CommunityInvite, CommunityJoinRequest, TribeRequest
from .serializers import TribeRequestSerializer, CommunitySerializer, InviteUserSerializer, CommunityInviteSerializer, TribeDetailSerializer, TribeSerializer
from users.models import Star
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from notifications.services import create_notification
from users.models import User
from django.db.models import Q, Case, When, Value, IntegerField, Count, F
from django.utils.timezone import now
from datetime import timedelta

class InvitePagination(PageNumberPagination):

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 20

class FeedPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 30

def get_membership(user, community):
    return CommunityMembership.objects.filter(
        user=user,
        community=community
    ).first()


def get_user_role(user, community):
    if user == community.owner:
        return "owner"

    membership = get_membership(user, community)
    if not membership:
        return "member"

    return membership.role


def can_moderate(user, community):
    role = get_user_role(user, community)
    return role in ["owner", "admin", "moderator"]


def can_manage_settings(user, community):
    return user == community.owner or get_user_role(user, community) == "admin"

class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.all().order_by('-created_at')
    serializer_class = CommunitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
      print("REQUEST DATA:", self.request.data)
  
      serializer.is_valid(raise_exception=True)
  
      tribe_id = self.request.data.get("tribe")
  
      community = serializer.save(
          owner=self.request.user,
          tribe_id=tribe_id,
      )
  
      CommunityMembership.objects.create(
          community=community,
          user=self.request.user,
          role="owner",
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
    
        # BANNED
        if membership and membership.banned:
            return Response(
                {"error": "You are banned"},
                status=403
            )
    
        # ALREADY MEMBER
        if membership:
            return Response({
                "status": "already_joined"
            })
    
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
    
        memberships = CommunityMembership.objects.filter(
            community=community,
            banned=False
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
                "avatar": getattr(community.owner, "avatar", None),
                "role": "owner",
                "muted": False,
                "banned": False,
            })
    
        for m in memberships:
    
            # skip owner duplicate
            if m.user_id == community.owner_id:
                continue
    
            data.append({
                "id": m.user.id,
                "username": m.user.username,
                "avatar": getattr(m.user, "avatar", None),
                "role": m.role,
                "muted": m.muted,
                "banned": m.banned,
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
                    "avatar": (
                        r.user.avatar.url
                        if hasattr(r.user.avatar, "url")
                        else r.user.avatar
                    )
                }
            }
            for r in result
        ]
    
        return paginator.get_paginated_response(data)

    @action(detail=True, methods=["get", "patch"], url_path="settings")
    def community_settings(self, request, pk=None):
        community = self.get_object()

        # GET SETTINGS
        if request.method == "GET":
            memberships = CommunityMembership.objects.filter(community=community, banned=False).select_related("user")

            moderators = memberships.filter(role="moderator")[:5]
            admins = memberships.filter(role="admin")

            return Response({
                "id": community.id,
                "name": community.name,
                "description": community.description,
                "cover_image": community.cover_image,
                "intro_video": community.intro_video,
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
            })

        # UPDATE SETTINGS
        if request.method == "PATCH":

            if request.user != community.owner and not CommunityMembership.objects.filter(
                user=request.user,
                community=community,
                role="admin"
            ).exists():
                return Response({"error": "Not allowed"}, status=403)

            community.name = request.data.get("name", community.name)
            community.description = request.data.get("description", community.description)
            community.cover_image = request.data.get("cover_image", community.cover_image)
            community.intro_video = request.data.get("intro_video", community.intro_video)
            community.require_post_approval = request.data.get(
                "require_post_approval",
                community.require_post_approval
            )
            community.join_approval_required = request.data.get(
                "join_approval_required",
                community.join_approval_required
            )

            community.save()

            return Response({"status": "updated", "require_post_approval": community.require_post_approval, "join_approval_required": community.join_approval_required})

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
        methods=["post"]
    )
    def refresh_feed(self, request, pk=None):
    
        user = request.user
    
        key = f"feed_seed:{user.id}"
    
        redis_client.delete(key)
    
        return Response({
            "success": True
        })

    @action(detail=True, methods=["get"])
    def pending_posts(self, request, pk=None):
        community = self.get_object()
    
        if can_moderate(request.user, community):
            posts = Post.objects.filter(
                community=community,
                is_approved=False,
                is_rejected=False
            )
        else:
            posts = Post.objects.filter(
                community=community,
                user=request.user,
                is_approved=False,
                is_rejected=False
            )
    
        paginator = FeedPagination()
        result_page = paginator.paginate_queryset(
            posts,
            request
        )
  
        serializer = PostSerializer(
            result_page,
            many=True,
            context={"request": request}
        )
    
        return paginator.get_paginated_response(
            serializer.data
        )

    @action(detail=True, methods=["get"])
    def approved_posts(self, request, pk=None):
        community = self.get_object()
    
        if can_moderate(request.user, community):
            posts = Post.objects.filter(
                community=community,
                is_approved=True
            )
  
            reposts = Repost.objects.filter(
                community=community
            )
        else:
            posts = Post.objects.filter(
                community=community,
                user=request.user,
                is_approved=True
            )
  
  
            reposts = Repost.objects.filter(
                community=community,
                user=request.user
            )
  
        for post in posts:
            post.type = "post"
    
        for repost in reposts:
            repost.type = "repost"
    
        combined = list(chain(posts, reposts))
  
        combined.sort(
            key=lambda x: (
                getattr(x, "community_pinned", False),
                -(getattr(x, "community_pin_order", 0) or 0),
                x.created_at.timestamp() if x.created_at else 0,
            ),
            reverse=True
        )

        paginator = FeedPagination()
        result_page = paginator.paginate_queryset(
            combined,
            request
        )

        serialized_data = []

        for item in result_page:

          if item.type == "post":
  
              serialized_data.append(
                  PostSerializer(
                      item,
                      context={"request": request}
                  ).data
              )
  
          else:
  
              serialized_data.append(
                  RepostSerializer(
                      item,
                      context={"request": request}
                  ).data
              )
    
        return paginator.get_paginated_response(
            serialized_data
        )

    @action(detail=True, methods=["get"])
    def rejected_posts(self, request, pk=None):
        community = self.get_object()
    
        if can_moderate(request.user, community):
            posts = Post.objects.filter(
                community=community,
                is_rejected=True
            )
        else:
            posts = Post.objects.filter(
                community=community,
                user=request.user,
                is_rejected=True
            )
    
        paginator = FeedPagination()
        result_page = paginator.paginate_queryset(
            posts,
            request
        )

        serializer = PostSerializer(
            result_page,
            many=True,
            context={"request": request}
        )
    
        return paginator.get_paginated_response(
            serializer.data
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
        ids = request.data.get("ids", [])
    
        if not isinstance(ids, list):
            return Response({"error": "Invalid"}, status=400)
    
        Post.objects.filter(id__in=ids, user=request.user).update(is_deleted=True)
    
        return Response({"status": "deleted"})
  
    @action(detail=False, methods=["post"])
    def moderate(self, request):
        post_ids = request.data.get("post_ids", [])
        action = request.data.get("action")
    
        if not post_ids or not action:
            return Response({"error": "Invalid request"}, status=400)
    
        posts = Post.objects.filter(id__in=post_ids)
    
        updated_posts = []
    
        for post in posts:
            community = post.community
    
            if not can_moderate(request.user, community):
                continue
    
            if action == "approve":
                post.is_approved = True
                post.is_rejected = False
    
                create_notification(
                    type="post_approved",
                    recipient=post.user,
                    actors=[request.user],
                    community=community,
                    post=post
                )
    
            elif action == "reject":
                post.is_rejected = True
                post.is_approved = False
    
                create_notification(
                    type="post_rejected",
                    recipient=post.user,
                    actors=[request.user],
                    community=community,
                    post=post
                )
    
            post.save()
            updated_posts.append(post.id)
    
        return Response({
            "status": "done",
            "updated": updated_posts
        })

    @action(detail=True, methods=["post"])
    def ban_user(self, request, pk=None):
        community = self.get_object()
    
        if request.user != community.owner:
            return Response({"error": "Only owner"}, status=403)
    
        membership = CommunityMembership.objects.get(
            community=community,
            user_id=request.data["user_id"]
        )
    
        membership.banned = True
        membership.save()

        create_notification(
            type="community_ban",
            recipient=membership.user,
            actors=[request.user],
            community=community
        )
    
        return Response({"status": "banned"})

    @action(detail=True, methods=["post"])
    def restore_user(self, request, pk=None):
        community = self.get_object()

        if request.user != community.owner:
            return Response({"error": "Only owner"}, status=403)

        membership = CommunityMembership.objects.get(
            community=community,
            user_id=request.data["user_id"]
        )

        membership.banned = False
        membership.save()

        create_notification(
            type="community_unban",
            recipient=membership.user,
            actors=[request.user],
            community=community
        )

        return Response({"status": "restored"})

    def get_permissions(self):
        if self.action in ['destroy']:
            return [IsAuthenticated(), IsOwner()]
        return [IsAuthenticated()]

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

    # 🔥 ALREADY MEMBER
    membership = CommunityMembership.objects.filter(
        community=community,
        user=receiver
    ).first()
    
    if membership:
        if membership.banned:
            return Response(
                {"error": "User is banned"},
                status=400
            )
    
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