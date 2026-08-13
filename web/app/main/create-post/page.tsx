'use client';
import { useState, useRef, useEffect, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { useCommunityPermissions } from "@/hooks/createPost/useCommunityPermissions";
import { useEditPost } from "@/hooks/createPost/useEditPost";
import { usePostMedia } from "@/hooks/createPost/usePostMedia";
import { usePostDraft } from "@/hooks/createPost/usePostDraft";
import { useMediaUpload, getFileKey } from "@/hooks/createPost/useMediaUpload";
import { uploadDebug } from "@/utils/mediaUpload/uploadDebug";
import { UploadNetworkError } from "@/utils/mediaUpload/errors";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { deletePostDraft } from "@/lib/messageDB";
import ButtonLoader from "@/components/ButtonLoader";
import Skeleton from '@/components/Skeleton';
import {
  toPostMediaPayload,
} from "@/utils/media";
import { apiRequest } from '@/utils/api';
import { updateFeedPost } from "@/lib/feedDb";

type ExistingVideo = {
  url: string;
  thumbnail?: string;
};

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");
  const { isOnline } = useNetwork();
  const [loading, setLoading] = useState(false);
  const clientPostIdRef = useRef<string | null>(null);
  const { push } = useNavigation()
  const isEdit = searchParams.get('edit') === 'true';
  const postId = searchParams.get('postId');
  const modeParam = searchParams.get('mode');

  const [mode, setMode] = useState<'global' | 'community' | 'reel'>(
    modeParam === 'reel'
      ? 'reel'
      : modeParam === 'community'
      ? 'community'
      : 'global'
  );

  // Selected community (could be from any tribe)
  const [selectedCommunity, setSelectedCommunity] = useState<number | null>(
    searchParams.get('communityId') ? Number(searchParams.get('communityId')) : null
  );

  const isGlobal = mode === 'global';
  const isCommunity = mode === 'community';
  const isReel = mode === 'reel';
  
  const {
    communityData,
    permissions,
    loadingCommunity,
  } = useCommunityPermissions({
    selectedCommunity,
    setMode,
  });
  
  const getClientPostId = () => {
    if (!clientPostIdRef.current) {
      clientPostIdRef.current = crypto.randomUUID();
    }
  
    return clientPostIdRef.current;
  };
  
  const allowReel = permissions.allow_reels;
  const allowVideo =
    isGlobal ||
    isReel ||
    permissions.allow_videos;
  const allowImages = true;
  
  const {
    imageFiles,
    imageUrls,
    video,
    videoPreview,
    previewImages,
    hasImages,
    hasVideo,
    setImageFiles,
    setImageUrls,
    setVideo,
    setVideoPreview,
    handleImagesChange,
    handleVideoChange,
    removeImage,
    removeVideo,
    clearMedia,
  } = usePostMedia({
    allowImages: true,
    allowVideo,
    maxImages: 15,
  });
  
  const {
    uploadedMedia,
    uploading,
    uploadError,
    fileProgress,
    uploadPromiseRef,
    setUploadedMedia,
    setFileProgress,
    uploadStatus,
  } = useMediaUpload({
    content,
    imageFiles,
    imageUrls,
    video,
    selectedCommunity,
    isReel,
    isOnline,
  });
  
  const {
    draftCount,
    saveDraft,
    saveAutoDraft,
    prepareForManualDraft,
    finishManualDraftSave,
  } = usePostDraft({
    isEdit,
    draftId,
    content,
    imageFiles,
    imageUrls,
    video,
    selectedCommunity,
    communityData,
    isOnline,
    setContent,
    setImageFiles,
    setImageUrls,
    setVideo,
    setVideoPreview,
    setSelectedCommunity,
  });
  
  // =============================
  // 🔥 EDIT MODE LOAD
  // =============================
  useEditPost({
    isEdit,
    postId,
    setContent,
    setSelectedCommunity,
    setMode,
    setVideo,
    setVideoPreview,
    setImageUrls,
    setImageFiles,
    setUploadedMedia,
  });
  
  const handleSaveDraft = async () => {
    if (
      !content.trim() &&
      imageFiles.length === 0 &&
      imageUrls.length === 0 &&
      !video
    ) {
      toast.error("Nothing to save as draft");
      return;
    }
  
    await saveDraft();
  
    setContent("");
    clearMedia();
    setUploadedMedia([]);
    setFileProgress({});
  
    toast.success("Draft saved");
  };
  
  const handleUploadFailure = async () => {
    try {
      prepareForManualDraft();
  
      await saveDraft();
  
      toast.error("Upload failed. Post saved to Drafts.");
  
      return true;
    } catch (error) {
      console.error("Failed to save draft:", error);
      toast.error("Upload failed and draft could not be saved.");
      return false;
    } finally {
      finishManualDraftSave();
    }
  };
  
  const handleOfflinePost = async () => {
    try {
      prepareForManualDraft();
  
      await saveDraft();
  
      setContent("");
      clearMedia();
      setUploadedMedia([]);
      setFileProgress({});
  
      toast.success("You're offline. Post saved to Drafts.");
  
      return true;
    } catch (error) {
      console.error("Failed to save offline post:", error);
      toast.error("Could not save post to Drafts.");
      return false;
    } finally {
      finishManualDraftSave();
    }
  };
  
  const handlePost = async () => {
    if (!isOnline) {
      await handleOfflinePost();
      return;
    }
  
    const hasText = content.trim().length > 0;

    const hasImages =
        imageFiles.length > 0 ||
        imageUrls.length > 0;
  
    const hasVideo = !!video;
  
    const hasUploadedMedia =
        uploadedMedia.length > 0;
  
    if (
        !hasText &&
        !hasImages &&
        !hasVideo &&
        !hasUploadedMedia
    ) {
        toast.error("Write something or attach media.");
        return;
    }

    if ((mode === "community" || mode === "reel") && !selectedCommunity) {
      alert("Please select a community");
      return;
    }

    setLoading(true);
    setFileProgress({});
  
    try {
      if (uploadError) {
        const saved = await handleUploadFailure();
      
        if (saved) {
          return;
        }
      
        return;
      }
    
      let media = uploadedMedia;

      if (uploading && uploadPromiseRef.current) {
        const toastId = toast.loading("Finishing upload...");
      
        try {
          media = await uploadPromiseRef.current;
      
          uploadPromiseRef.current = null;
      
          toast.dismiss(toastId);
        } catch (uploadError) {
          console.error("Media upload failed:", uploadError);
      
          toast.dismiss(toastId);
      
          // Save as MANUAL draft
          const saved = await handleUploadFailure();
      
          if (saved) {
            return;
          }
      
          return;
        }
      
        // Upload finished but user went offline
        if (!isOnline) {
          const saved = await handleOfflinePost();
      
          if (saved) {
            return;
          }
      
          return;
        }
      }
  
      if (uploadError) {
        const saved =
          await handleUploadFailure();
      
        if (saved) {
          return;
        }
      
        return;
      }
    
      const hasText = content.trim().length > 0;
      const hasMedia = media.length > 0;
      
      if (!hasText && !hasMedia) {
        await handleUploadFailure();
        return;
      }
  
      let contentType = "text";

      if (video) {
        if (isReel) {
          contentType = "short_video";
        } else {
          contentType = "long_video";
        }
      } else if (
        imageFiles.length > 0 ||
        imageUrls.length > 0
      ) {
        contentType = "image";
      }
      
      contentType = String(contentType);

      const media_files = media.map(
        toPostMediaPayload
      );
  
      const payload = {
        caption: content,
        content_type: contentType,
        media_files,
        community: selectedCommunity,
        client_post_id: getClientPostId(),
      };
  
      const editPayload = {
        caption: content,
        content_type: contentType,
        media_files,
        community: selectedCommunity,
      };
  
      let newPost = null;

      if (isEdit) {
        if (!isOnline) {
          await handleOfflinePost();
          return;
        }
  
        const updatedPost = await apiRequest(`api/post/${postId}/`, {
            method: "PUT",
            data: editPayload,
        });
  
        if (!postId) {
          console.error("Missing postId");
          return;
        }
  
        const numericPostId = Number(postId);
  
        if (!Number.isFinite(numericPostId)) {
          console.error("Invalid postId:", postId);
          return;
        }

        await updateFeedPost(numericPostId, {
          caption: updatedPost.caption,
          media_files: updatedPost.media_files,
          updated_at: updatedPost.updated_at,
          is_edited: true,
        });
    
        toast.success("Post updated!");
        push("/main/home");
        return;
      }

      if (
          payload.caption.trim() === "" &&
          payload.media_files.length === 0
      ) {
          toast.error("Cannot create an empty post.");
          return;
      }
  
      if (!isOnline) {
        await handleOfflinePost();
        return;
      }
  
      await uploadDebug({
        event: "POST_CREATE_START",
        level: "info",
        data: {
          text_length: text?.length ?? 0,
          media_count: media?.length ?? 0,
          media_ids: media?.map(
            item => item.media_id
          ),
          has_text: Boolean(text?.trim()),
        },
      });

      newPost = await apiRequest(`api/post/`, {
        method: "POST",
        data: payload,
      });

      await uploadDebug({
        event: "POST_CREATE_RESPONSE",
        level: "info",
        data: {
          status: response?.status,
          success: response?.success,
          media_id: response?.media_id,
        },
      });
  
      clientPostIdRef.current = null;
  
      setContent('');
      setImageUrls([]);
      setImageFiles([]);
      setVideo(null);
      setFileProgress({});
      await deletePostDraft(
          selectedCommunity
              ? `auto-community-${selectedCommunity}`
              : "auto-global"
      );
      
      if (draftId) {
          await deletePostDraft(draftId);
      }
      
      if (!newPost?.is_approved) {
        toast.success("Post submitted for approval.");
        push("/main/home");
        return;
      }

      toast.success("Post created!");

      if (newPost.content_type === "short_video") {
        sessionStorage.setItem(
            "clicked_reel_id",
            String(newPost.id)
        );
    
        push(`/main/reels/${newPost.id}`);
        return;
      }
      
      const feedPost = {
          ...newPost,
          feed_type: "post",
          is_starred_by_user: false,
      };
      
      sessionStorage.setItem(
          "new_post",
          JSON.stringify(feedPost)
      );
      
      push("/main/home");
      return;
    } catch (err: any) {
      console.log("FULL ERROR:", err.data || err);
      console.error(err);
    
      await uploadDebug({
        event: "POST_CREATE_ERROR",
        level: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
      });

      const isUploadNetworkError =
        err?.isNetworkError === true ||
        err?.name === "UploadNetworkError" ||
        err?.message?.toLowerCase().includes("network error");
    
      if (!isOnline || isUploadNetworkError) {
        const saved = await handleOfflinePost();
    
        if (saved) {
          toast.error(
            "Connection lost. Your post was saved to Drafts and can be resumed when you're back online."
          );
        }
    
        return;
      }
    
      toast.error(
        err?.data?.media ||
        err?.data?.detail ||
        "Failed to create post."
      );
    
      setFileProgress({});
    } finally {
      setLoading(false);
    }
  };
  
  // Render individual progress bar
    const renderProgressBar = (file: File) => {
      const progress =
        fileProgress[getFileKey(file)] || 0;
    
      return (
        <div
          key={getFileKey(file)}
          className="w-full bg-gray-200 rounded-full h-2 mt-1"
        >
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      );
    };
  
  if (loadingCommunity) {
    return <Skeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 my-20 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {isEdit
          ? allowReel
            ? `Edit ${communityData?.tribe?.name} Post`
            : selectedCommunity
            ? `Edit ${communityData?.name} Post`
            : "Edit Post"
          : allowReel
          ? `Create ${communityData?.tribe?.name} Post`
          : selectedCommunity
          ? `Create ${communityData?.name} Post`
          : "Create Post"}
      </h1>

      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm transition-colors space-y-3">
        {/* Mode Switch */}
        <div className="flex gap-2 mb-2">

          {/* GLOBAL */}
          {isGlobal && (
            <button
              onClick={() => {
                setMode('global');
                setSelectedCommunity(null);
              }}
              className={`px-3 py-1 rounded-full font-medium ${
                isGlobal ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-500'
              }`}
            >
              Global
            </button>
          )}
        
          {/* COMMUNITY */}
          {isCommunity && (
            <button
              onClick={() => {
                setMode('community');
              }}
              className={`px-3 py-1 rounded-full font-medium ${
                isCommunity ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-500'
              }`}
            >
              Community
            </button>
          )}
        
          {/* REEL */}
          {isReel && allowReel && (
            <button
              onClick={() => {
                setMode('reel');
              }}
              className={`px-3 py-1 rounded-full font-medium ${
                isReel ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-500'
              }`}
            >
              {`${communityData?.tribe?.name} Post`}
            </button>
          )}
        
        </div>
        <AppLink href="/main/draft" className="absolute top-16 right-10 border rounded-xl text-sm p-3 text-gray-700 dark:text-gray-200 font-bold mb-6">
          Drafts • {draftCount}
        </AppLink>
  
        {!isOnline && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r mt-3 from-amber-50 to-orange-50 p-4 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M1 9l2-2c4.4-4.4 11.6-4.4 16 0l2 2" />
                  <path d="M5 13l2-2c2.8-2.8 7.2-2.8 10 0l2 2" />
                  <path d="M9 17l1.5-1.5c.8-.8 2.2-.8 3 0L15 17" />
                  <path d="M12 21h.01" />
                </svg>
              </div>
        
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                    You're offline
                  </h3>
        
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                    Draft mode
                  </span>
                </div>
        
                <p className="mt-1 text-sm leading-5 text-amber-800/80 dark:text-amber-300/80">
                  Don't worry — your post is safe. It will be saved to Drafts
                  until your connection comes back.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          placeholder="What's happening in your tribe?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={4}
        />

        {/* Images Preview */}
        {previewImages.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {previewImages.map((file, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={
                    file instanceof File
                      ? URL.createObjectURL(file)
                      : file
                  }
                  alt={`preview-${idx}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
        
                <button
                  onClick={() => {
                    if (imageFiles.length > 0) {
                      removeImage(idx);
                    } else {
                      setImageUrls(prev =>
                        prev.filter((_, i) => i !== idx)
                      );
                    }
                  }}
                  className="absolute top-1 right-1 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-80 hover:opacity-100 transition"
                >
                  ×
                </button>
        
                {file instanceof File && loading &&
                  renderProgressBar(file)}
              </div>
            ))}
          </div>
        )}

        {/* Video Preview */}
        {video && (
          <div className="relative mt-2">
            <video
              src={
                video instanceof File
                  ? videoPreview
                  : video.url
              }
              poster={
                video instanceof File
                  ? undefined
                  : video?.thumbnail
              }
              preload="metadata"
              onLoadedMetadata={(e) => {
                if (video instanceof File) {
                  e.currentTarget.currentTime = 0.01;
                }
              }}
              controls
              className={`w-full ${allowReel ? 'h-[500px] object-cover' : 'max-h-48 object-contain'} rounded-lg`} />
            <button
              onClick={removeVideo}
              className="absolute top-2 right-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
              title="Remove video"
            >
              ×
            </button>
            {loading && video instanceof File && renderProgressBar(video)}
          </div>
        )}

        {/* Upload buttons */}
        <div className="flex gap-4 mt-2">
          {previewImages.length < 15 && (
            <label
              className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed p-2 rounded-lg cursor-pointer transition hover:border-indigo-500"
            >
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {previewImages.length > 0
                  ? `Images ${previewImages.length}/15`
                  : "Add Images"}
              </span>
          
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                className="hidden"
                disabled={!!video}
              />
            </label>
          )}

          <label
            className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed p-2 rounded-lg cursor-pointer transition 
            ${(!allowVideo && !allowReel) ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500'}`}
          >
            <span className="text-gray-500 dark:text-gray-400 text-sm">{allowReel ? "Add Reel" : "Add Video"}</span>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
              disabled={imageFiles.length > 0 || imageUrls.length > 0}
            />
          </label>
        </div>

        {/* Post button */}
        <div className="flex gap-3">
            <button
                onClick={handleSaveDraft}
                className="w-full py-2 rounded-lg text-gray-700 dark:text-white border border-gray-300"
            >
                Save Draft
            </button>
        
            <button
              onClick={handlePost}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {loading ? <ButtonLoader /> : isEdit ? "Update Post" : "Post"}
            </button>
        </div>
      </div>
    </div>
  );
}