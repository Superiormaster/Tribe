"use client";

import {
  useState,
  useContext
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import toast from "react-hot-toast";

import AppLink from "@/components/AppLink";
import ButtonLoader from "@/components/ButtonLoader";
import Skeleton from "@/components/Skeleton";
import {
  type StoredPostUploadJob,
} from "@/lib/postUploadDB";
import {
  useNavigation,
} from "@/utils/useNavigation";

import {
  useNetwork,
} from "@/components/networkConnection/NetworkContext";

import {
  useCommunityPermissions,
} from "@/hooks/createPost/useCommunityPermissions";

import {
  useEditPost,
} from "@/hooks/createPost/useEditPost";

import {
  usePostMedia,
} from "@/hooks/createPost/usePostMedia";

import {
  usePostDraft,
} from "@/hooks/createPost/usePostDraft";

import {
  useMediaUpload,
  getFileKey,
} from "@/hooks/createPost/useMediaUpload";

import {
  usePostUpload,
} from "@/components/PostUploadProvider";

import {
  deletePostDraft,
} from "@/lib/messageDB";

import { UserContext } from '@/components/UserContext'

import {
  updateFeedPost,
} from "@/lib/feedDb";

import type {
  UploadedMedia,
} from "@/utils/media";

type ExistingVideo = {
  url: string;
  thumbnail?: string;
};

export default function CreatePostPage() {
  const searchParams =
    useSearchParams();

  const { isOnline } =
    useNetwork();
  
  const {
    user,
  } = useContext(UserContext)!;

  const { push } =
    useNavigation();

  const {
    enqueuePost,
  } = usePostUpload();

  const draftId =
    searchParams.get("draftId");

  const isEdit =
    searchParams.get("edit") === "true";

  const postId =
    searchParams.get("postId");

  const modeParam =
    searchParams.get("mode");

  const [
    content,
    setContent,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    mode,
    setMode,
  ] = useState<
    "global" |
    "community" |
    "reel"
  >(
    modeParam === "reel"
      ? "reel"
      : modeParam === "community"
        ? "community"
        : "global",
  );

  const [
    selectedCommunity,
    setSelectedCommunity,
  ] = useState<number | null>(
    searchParams.get("communityId")
      ? Number(
          searchParams.get(
            "communityId",
          ),
        )
      : null,
  );

  const isGlobal =
    mode === "global";

  const isCommunity =
    mode === "community";

  const isReel =
    mode === "reel";

  const {
    communityData,
    permissions,
    loadingCommunity,
  } =
    useCommunityPermissions({
      selectedCommunity,
      setMode,
    });

  const allowReel =
    permissions.allow_reels;

  const allowVideo =
    isGlobal ||
    isReel ||
    permissions.allow_videos;

  const {
    imageFiles,
    imageUrls,
    video,
    videoPreview,
    previewImages,

    setImageFiles,
    setImageUrls,
    setVideo,
    setVideoPreview,

    handleImagesChange,
    handleVideoChange,

    removeImage,
    removeVideo,

    clearMedia,
  } =
    usePostMedia({
      allowImages: true,
      allowVideo,
      maxImages: 15,
    });

  const {
    fileProgress,
    setUploadedMedia,
  } =
    useMediaUpload({
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
    prepareForManualDraft,
    finishManualDraftSave,
  } =
    usePostDraft({
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

  const handleSaveDraft =
    async () => {
      if (
        !content.trim() &&
        imageFiles.length === 0 &&
        imageUrls.length === 0 &&
        !video
      ) {
        toast.error(
          "Nothing to save as draft",
        );

        return;
      }

      try {
        await saveDraft();

        setContent("");

        clearMedia();

        setUploadedMedia([]);

        toast.success(
          "Draft saved",
        );
      } catch (error) {
        console.error(
          "Save draft failed:",
          error,
        );

        toast.error(
          "Could not save draft.",
        );
      }
    };

  const getPostFiles =
    (): File[] => {
      const files: File[] = [];

      for (
        const item of imageFiles
      ) {
        if (
          item instanceof File
        ) {
          files.push(item);
        }
      }

      if (
        video instanceof File
      ) {
        files.push(video);
      }

      return files;
    };

  const queuePost =
    async () => {
      console.log(
        "[CreatePost][1] queuePost() START",
        {
          isEdit,
          isOnline,
          userId: user?.id,
          contentLength: content.length,
          imageFilesCount: imageFiles.length,
          imageUrlsCount: imageUrls.length,
          hasVideo: video instanceof File,
          mode,
          selectedCommunity,
        },
      );
  
      const hasText =
        content.trim().length > 0;
  
      const hasImages =
        imageFiles.length > 0 ||
        imageUrls.length > 0;
  
      const hasVideo =
        video instanceof File;
  
      console.log(
        "[CreatePost][2] Content validation",
        {
          hasText,
          hasImages,
          hasVideo,
        },
      );
  
      if (
        !hasText &&
        !hasImages &&
        !hasVideo
      ) {
        console.warn(
          "[CreatePost] STOP: empty post",
        );
  
        toast.error(
          "Write something or attach media.",
        );
  
        return;
      }
  
      if (
        (
          mode === "community" ||
          mode === "reel"
        ) &&
        !selectedCommunity
      ) {
        console.warn(
          "[CreatePost] STOP: missing community",
        );
  
        toast.error(
          "Please select a community.",
        );
  
        return;
      }
  
      if (
        !isEdit &&
        imageUrls.length > 0
      ) {
        console.warn(
          "[CreatePost] STOP: create post contains remote imageUrls",
          imageUrls,
        );
  
        toast.error(
          "Please use uploaded files for a new post.",
        );
  
        return;
      }
  
      const files =
        getPostFiles();
  
      console.log(
        "[CreatePost][3] Files collected",
        files.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        })),
      );
  
      const contentType =
        video instanceof File
          ? isReel
            ? "short_video"
            : "long_video"
          : files.length > 0
            ? "image"
            : "text";
  
      console.log(
        "[CreatePost][4] Content type",
        {
          contentType,
          fileCount: files.length,
          isReel,
        },
      );
  
      prepareForManualDraft();
  
      try {
        console.log(
          "[CreatePost][5] Generating IDs...",
        );
  
        const jobId =
          crypto.randomUUID();
  
        const clientPostId =
          crypto.randomUUID();
  
        const ownerId =
          user.id;
  
        console.log(
          "[CreatePost][6] IDs generated",
          {
            jobId,
            clientPostId,
            ownerId,
            ownerIdString:
              String(ownerId),
          },
        );
  
        const job: StoredPostUploadJob = {
          job_id: jobId,
  
          owner_id:
            String(ownerId),
  
          client_post_id:
            clientPostId,
  
          content,
  
          mode,
  
          content_type:
            contentType,
  
          selected_community:
            selectedCommunity,
  
          community_name:
            communityData?.name ||
            "",
  
          tribe_name:
            communityData?.tribe?.name ||
            "",
  
          media: files.map(
            (file) => ({
              media_key:
                crypto.randomUUID(),
  
              file,
  
              file_name:
                file.name,
  
              file_type:
                file.type,
  
              file_size:
                file.size,
  
              file_last_modified:
                file.lastModified,
  
              media_type:
                file.type.startsWith(
                  "video/",
                )
                  ? "video"
                  : "image",
  
              status:
                "queued",
  
              progress: 0,
  
              uploaded_parts: [],
            }),
          ),
  
          status:
            "queued",
  
          progress: 0,
  
          retry_count: 0,
  
          is_draft: false,
  
          created_at:
            Date.now(),
  
          updated_at:
            Date.now(),
        };
  
        console.log(
          "[CreatePost][7] JOB CREATED",
          {
            jobId: job.job_id,
            ownerId: job.owner_id,
            clientPostId:
              job.client_post_id,
            status: job.status,
            contentType:
              job.content_type,
            mediaCount:
              job.media.length,
  
            media: job.media.map(
              (media) => ({
                mediaKey:
                  media.media_key,
                name:
                  media.file_name,
                type:
                  media.media_type,
                size:
                  media.file_size,
                status:
                  media.status,
              }),
            ),
          },
        );
  
        console.log(
          "[CreatePost][8] Calling enqueuePost()...",
        );
  
        const createdJob =
          await enqueuePost(job);
  
        console.log(
          "[CreatePost][9] enqueuePost() RETURNED",
          {
            jobId:
              createdJob.job_id,
            status:
              createdJob.status,
            progress:
              createdJob.progress,
            media:
              createdJob.media.map(
                (media) => ({
                  name:
                    media.file_name,
                  status:
                    media.status,
                  progress:
                    media.progress,
                }),
              ),
          },
        );
  
        setContent("");
        clearMedia();
        setUploadedMedia([]);
  
        console.log(
          "[CreatePost][10] Composer cleared",
        );
  
        await deletePostDraft(
          selectedCommunity
            ? `auto-community-${selectedCommunity}`
            : "auto-global",
        );
  
        if (draftId) {
          await deletePostDraft(
            draftId,
          );
        }
  
        console.log(
          "[CreatePost][11] Draft cleanup complete",
        );
  
        toast.success(
          isOnline
            ? "Post queued. Uploading in the background."
            : "Post queued. It will publish when you're back online.",
        );
  
        console.log(
          "[CreatePost][12] queuePost() SUCCESS",
          {
            jobId:
              createdJob.job_id,
          },
        );
  
      } catch (error) {
        console.error(
          "[CreatePost][ERROR] queuePost() FAILED",
          error,
        );
  
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not queue post.",
        );
  
      } finally {
        finishManualDraftSave();
  
        console.log(
          "[CreatePost][13] queuePost() FINALLY",
        );
      }
    };

  const updateExistingPost =
    async () => {
      if (!postId) {
        throw new Error(
          "Missing post ID.",
        );
      }

      if (!isOnline) {
        throw new Error(
          "Reconnect to update this post.",
        );
      }

      const media: UploadedMedia[] =
        [];

      const {
        apiRequest,
      } = await import(
        "@/utils/api"
      );

      const contentType =
        video instanceof File
          ? isReel
            ? "short_video"
            : "long_video"
          : imageUrls.length > 0
            ? "image"
            : "text";

      const payload = {
        caption:
          content.trim(),

        content_type:
          contentType,

        media_files:
          media,

        community:
          selectedCommunity,
      };

      const updatedPost =
        await apiRequest(
          `api/post/${postId}/`,
          {
            method: "PUT",
            data: payload,
          },
        );

      const numericPostId =
        Number(postId);

      if (
        !Number.isFinite(
          numericPostId,
        )
      ) {
        throw new Error(
          "Invalid post ID.",
        );
      }

      await updateFeedPost(
        numericPostId,
        {
          ...updatedPost,
          caption:
            updatedPost.caption,
          media_files:
            updatedPost.media_files,
          updated_at:
            updatedPost.updated_at,
          is_edited: true,
        },
      );

      toast.success(
        "Post updated!",
      );

      push(
        "/main/home",
      );
    };

  const handlePost =
    async () => {
      if (loading) {
        return;
      }

      setLoading(true);

      try {
        if (isEdit) {
          await updateExistingPost();
          return;
        }

        await queuePost();

      } catch (error) {
        console.error(
          "[CreatePost] Post error:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Could not create post.",
        );

      } finally {
        setLoading(false);
      }
    };

  const renderProgressBar =
    (file: File) => {
      const progress =
        fileProgress[
          getFileKey(file)
        ] || 0;

      return (
        <div
          key={getFileKey(file)}
          className="w-full bg-gray-200 rounded-full h-2 mt-1"
        >
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{
              width:
                `${progress}%`,
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

          {isGlobal && (
            <button
              onClick={() => {
                setMode("global");
                setSelectedCommunity(
                  null,
                );
              }}
              className="px-3 py-1 rounded-full font-medium bg-indigo-600 text-white"
            >
              Global
            </button>
          )}

          {isCommunity && (
            <button
              onClick={() => {
                setMode(
                  "community",
                );
              }}
              className="px-3 py-1 rounded-full font-medium bg-indigo-600 text-white"
            >
              Community
            </button>
          )}

          {isReel &&
            allowReel && (
              <button
                onClick={() => {
                  setMode(
                    "reel",
                  );
                }}
                className="px-3 py-1 rounded-full font-medium bg-indigo-600 text-white"
              >
                {`${communityData?.tribe?.name} Post`}
              </button>
            )}
        </div>

        <AppLink
          href="/main/draft"
          className="absolute top-16 right-10 border rounded-xl text-sm p-3 text-gray-700 dark:text-gray-200 font-bold mb-6"
        >
          Drafts • {draftCount}
        </AppLink>

        {/* Network information */}

        {!isOnline && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
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

              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                  You're offline
                </h3>

                <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80">
                  You can still press Post. Tribe will
                  keep the post in the background queue
                  and publish it when your connection
                  returns.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Text */}

        <textarea
          placeholder="What's happening in your tribe?"
          value={content}
          onChange={(e) =>
            setContent(
              e.target.value,
            )
          }
          className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={4}
        />

        {/* Images */}

        {previewImages.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">

            {previewImages.map(
              (file, idx) => (
                <div
                  key={idx}
                  className="relative group"
                >

                  <img
                    src={
                      file instanceof File
                        ? URL.createObjectURL(
                            file,
                          )
                        : file
                    }
                    alt={`preview-${idx}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        imageFiles.length >
                        0
                      ) {
                        removeImage(
                          idx,
                        );
                      } else {
                        setImageUrls(
                          (prev) =>
                            prev.filter(
                              (
                                _,
                                i,
                              ) =>
                                i !==
                                idx,
                            ),
                        );
                      }
                    }}
                    className="absolute top-1 right-1 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-80 hover:opacity-100 transition"
                  >
                    ×
                  </button>

                  {file instanceof File &&
                    renderProgressBar(
                      file,
                    )}

                </div>
              ),
            )}

          </div>
        )}

        {/* Video */}

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
                  : video.thumbnail
              }
              preload="metadata"
              controls
              className={`w-full ${
                allowReel
                  ? "h-[500px] object-cover"
                  : "max-h-48 object-contain"
              } rounded-lg`}
            />

            <button
              type="button"
              onClick={
                removeVideo
              }
              className="absolute top-2 right-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
            >
              ×
            </button>

            {video instanceof File &&
              renderProgressBar(
                video,
              )}

          </div>
        )}

        {/* Media buttons */}

        <div className="flex gap-4 mt-2">

          {previewImages.length <
            15 && (
            <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed p-2 rounded-lg cursor-pointer transition hover:border-indigo-500">

              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {previewImages.length >
                0
                  ? `Images ${previewImages.length}/15`
                  : "Add Images"}
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={
                  handleImagesChange
                }
                className="hidden"
                disabled={
                  !!video
                }
              />

            </label>
          )}

          <label
            className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed p-2 rounded-lg cursor-pointer transition ${
              !allowVideo &&
              !allowReel
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-indigo-500"
            }`}
          >
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {allowReel
                ? "Add Reel"
                : "Add Video"}
            </span>

            <input
              type="file"
              accept="video/*"
              onChange={
                handleVideoChange
              }
              className="hidden"
              disabled={
                imageFiles.length >
                  0 ||
                imageUrls.length >
                  0
              }
            />
          </label>

        </div>

        {/* Actions */}

        <div className="flex gap-3">

          <button
            type="button"
            onClick={
              handleSaveDraft
            }
            className="w-full py-2 rounded-lg text-gray-700 dark:text-white border border-gray-300"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={
              handlePost
            }
            disabled={
              loading
            }
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {loading
              ? <ButtonLoader />
              : isEdit
                ? "Update Post"
                : "Post"}
          </button>

        </div>

      </div>
    </div>
  );
}