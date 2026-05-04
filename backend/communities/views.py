from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsSuperUser
from .models import Community, Tribe
from .serializers import CommunitySerializer, TribeDetailSerializer, TribeSerializer

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

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        community = self.get_object()
        community.members.add(request.user)
        return Response({'status': 'Joined community'})

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        community = self.get_object()
        users = community.members.all()
  
        data = [
            {
                "id": user.id,
                "username": user.username,
            }
            for user in users
        ]
        return Response(data) 

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        community = self.get_object()
        community.members.remove(request.user)
        return Response({'status': 'Left community'})

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

@api_view(['POST'])
def remove_member(request, community_id, user_id):
    community = Community.objects.get(id=community_id)
    if request.user != community.owner:
        return Response({'error': 'Not authorized'}, status=403)
    member = User.objects.get(id=user_id)
    community.members.remove(member)
    return Response({'success': True})