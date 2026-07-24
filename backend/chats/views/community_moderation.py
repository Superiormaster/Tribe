from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from chats.models import (
    CommunityEvent,
    AnnouncementChannel,
    AnnouncementPost,
)

from chats.serializers import (
    CommunityEventSerializer,
    AnnouncementChannelSerializer,
    AnnouncementPostSerializer,
)

class CommunityEventViewSet(viewsets.ModelViewSet):

    queryset = CommunityEvent.objects.all()

    serializer_class = CommunityEventSerializer

    permission_classes = [IsAuthenticated]

class AnnouncementChannelViewSet(viewsets.ModelViewSet):

    queryset = AnnouncementChannel.objects.all()

    serializer_class = AnnouncementChannelSerializer

    permission_classes = [IsAuthenticated]

class AnnouncementPostViewSet(viewsets.ModelViewSet):

    queryset = AnnouncementPost.objects.all()

    serializer_class = AnnouncementPostSerializer

    permission_classes = [IsAuthenticated]