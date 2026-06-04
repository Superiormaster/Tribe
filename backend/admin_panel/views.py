from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from users.models import User
from .permissions import IsAdmin
from .serializers import UserSerializer, ReportSerializer
from feedback.models import Report

@api_view(['GET'])
@permission_classes([IsAdmin])
def get_users(request):
    users = User.objects.all().order_by('-id')
    return Response(UserSerializer(users, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def ban_user(request):
    user_id = request.data.get('user_id')
    user = User.objects.get(id=user_id)
    user.is_active = False
    user.save()
    return Response({"message": "User banned"})


@api_view(['POST'])
@permission_classes([IsAdmin])
def unban_user(request):
    user_id = request.data.get('user_id')
    user = User.objects.get(id=user_id)
    user.is_active = True
    user.save()
    return Response({"message": "User unbanned"})


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_user_detail(request, user_id):
    user = User.objects.get(id=user_id)
    return Response(UserSerializer(user).data)

@api_view(['GET'])
@permission_classes([IsAdmin])
def get_reports(request):
    reports = Report.objects.all().order_by('-created_at')
    return Response(ReportSerializer(reports, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def resolve_report(request):
    report_id = request.data.get('report_id')
    report = Report.objects.get(id=report_id)
    report.status = 'resolved'
    report.save()
    return Response({"message": "Report resolved"})


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def delete_report(request, report_id):
    report = Report.objects.get(id=report_id)
    report.delete()
    return Response({"message": "Report deleted"})