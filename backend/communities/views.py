from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from itertools import chain
from operator import attrgetter
from post.models import Repost, Post
from post.serializers import RepostSerializer, PostSerializer
from .permissions import IsSuperUser
from .models import Community, Tribe, CommunityMembership, CommunityInvite, CommunityJoinRequest
from .serializers import CommunitySerializer, InviteUserSerializer, CommunityInviteSerializer, TribeDetailSerializer, TribeSerializer
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
        tribe_id = self.request.data.get('tribe')
        community = serializer.save(
            owner=self.request.user,
            tribe_id=tribe_id 
        )
        community.members.add(self.request.user)

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
                    "avatar": r.user.avatar.url
                    if r.user.avatar else None
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
    
        posts = Post.objects.filter(
            community=community,
            is_deleted=False,
            is_approved=True, 
            is_rejected=False
        ).select_related(
            "user",
            "community"
        ).prefetch_related(
            "media_files"
        ).annotate(
            likes_count=Count("likes", distinct=True),
            comments_count=Count(
                "comments",
                distinct=True
            ),
            shares_count=Count(
                "shares",
                distinct=True
            ),
            is_pinned=F("community_pinned"),
            pin_order=F("community_pin_order")
        ).order_by(
            "-community_pinned",
            "community_pin_order",
            "-created_at"
        )
    
        reposts = Repost.objects.filter(
            community=community
        ).select_related(
            "user",
            "post",
            "post__user",
            "post__community",
        ).prefetch_related(
            "post__media_files"
        )
        
        for post in posts:
            post.type = "post"
    
        for repost in reposts:
            repost.type = "repost"
    
        post_data = PostSerializer(
            posts,
            many=True,
            context={"request": request}
        ).data
    
        repost_data = RepostSerializer(
            reposts,
            many=True,
            context={"request": request}
        ).data
    
        combined = list(chain(post_data, repost_data))
        
        combined.sort(
            key=lambda x: (
                x.get("community_pinned", False),
                -(x.get("community_pin_order") or 0),
                parse_datetime(x["created_at"]).timestamp()
                if x.get("created_at")
                else 0
            ),
            reverse=True
        )

        paginator = FeedPagination()
        result_page = paginator.paginate_queryset(
            combined,
            request
        )
    
        return paginator.get_paginated_response(
            result_page
        )
  
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
    
        combined = list(chain(post_data, repost_data))
        
        combined.sort(
            key=lambda x: (
                x.get("community_pinned", False),
                -(x.get("community_pin_order") or 0),
                parse_datetime(x["created_at"]).timestamp()
                if x.get("created_at")
                else 0
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
            serializer_data
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

    @action(detail=False, methods=["post"])
    def bulk_moderate(self, request):
        post_ids = request.data.get("post_ids", [])
        action_type = request.data.get("action")
    
        posts = Post.objects.filter(id__in=post_ids)
    
        for post in posts:
            if action_type == "approve":
                post.is_approved = True
                post.is_rejected = False
    
            elif action_type == "reject":
                post.is_rejected = True
                post.is_approved = False
    
            post.save()
    
        return Response({"status": "done"})

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
    
        return Response({"status": "admin_removed"})

    @action(detail=True, methods=["post"])
    def approve_post(self, request, pk=None):
        post_id = request.data.get("post_id")

        post = Post.objects.get(
            id=post_id,
            community=community
        )
        community = post.community
    
        if not can_moderate(request.user, community):
            return Response({"error": "Not allowed"}, status=403)
    
        post.is_approved = True
        post.is_rejected = False
        post.save()
    
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject_post(self, request, pk=None):
        post_id = request.data.get("post_id")

        post = Post.objects.get(
            id=post_id,
            community=community
        )
        community = post.community
    
        if not can_moderate(request.user, community):
            return Response({"error": "Not allowed"}, status=403)
    
        post.is_rejected = True
        post.is_approved = False
        post.save()
    
        return Response({"status": "rejected"})

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
        if self.action == 'retrieve':
            return TribeDetailSerializer
        return TribeSerializer

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
    already_member = CommunityMembership.objects.filter(
        community=community,
        user=receiver
    ).exists()

    if already_member:
        return Response(
            {"error": "Already a member"},
            status=400
        )

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