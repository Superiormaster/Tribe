from django.urls import path
from .views import InitializeProfileMediaUploadView, CompleteProfileMediaUploadView, InitializeMediaUploadView, CompleteMediaUploadView, AbortMultipartUploadView, CompleteMultipartMediaUploadView, CancelMultipartUploadView, ResumeMultipartUploadView, MediaUploadDebugView

urlpatterns = [

    path(
        "profile/init/",
        InitializeProfileMediaUploadView.as_view(),
        name="profile-media-init",
    ),

    path(
        "profile/complete/",
        CompleteProfileMediaUploadView.as_view(),
        name="profile-media-complete",
    ),

    path(
        "initialize/",
        InitializeMediaUploadView.as_view(),
        name="initialize-media-upload",
    ),

    path(
        "debug/",
        MediaUploadDebugView.as_view(),
    ),

    path(
        "complete/",
        CompleteMediaUploadView.as_view(),
        name="complete-media-upload",
    ),
  
    path(
        "multipart/complete/",
        CompleteMultipartMediaUploadView.as_view(),
        name="media-multipart-complete",
    ),
  
    path(
        "multipart/resume/",
        ResumeMultipartUploadView.as_view(),
        name="media-multipart-resume",
    ),

    path(
        "multipart/cancel/",
        CancelMultipartUploadView.as_view(),
        name="media-multipart-cancel",
    ),

    path(
        "multipart/abort/",
        AbortMultipartUploadView.as_view(),
        name="media-multipart-abort",
    ),

]