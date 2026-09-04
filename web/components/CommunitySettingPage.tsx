"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/utils/api";
import Skeleton from "@/components/Skeleton";
import { useNavigation } from "@/utils/useNavigation";
import {
  Pause,
  Play,
  Repeat,
  VolumeX,
  Volume2,
} from "lucide-react";
import PermanentMediaTypeModal from "@/components/community/PermanentMediaTypeModal";
import {
  uploadMediaResumable
} from "@/utils/mediaUpload/uploadMediaResumable";
import { uploadMedia } from "@/utils/mediaUpload/uploadMedia";

export default function CommunitySettingsPage({
  communityId,
}: {
  communityId: string;
}) {
  const [community, setCommunity] = useState<any>({
    moderators: [],
    owner: {},
    admin: {},
  });

  const { replace } = useNavigation();

  const [loading, setLoading] = useState(true);
  const [showMediaWarning, setShowMediaWarning] =
    useState(false);
  const [pendingValue, setPendingValue] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [isPlaying, setIsPlaying] =
    useState(true);
  const [isMuted, setIsMuted] =
    useState(true);

  const [coverFile, setCoverFile] =
    useState<File | null>(null);
  const [videoFile, setVideoFile] =
    useState<File | null>(null);

  const [coverUrl, setCoverUrl] =
    useState("");
  const [videoUrl, setVideoUrl] =
    useState("");
  const [coverAssetId, setCoverAssetId] =
    useState<string | null>(null);
  
  const [videoAssetId, setVideoAssetId] =
    useState<string | null>(null);

  const [coverUploading, setCoverUploading] =
    useState(false);
  const [videoUploading, setVideoUploading] =
    useState(false);

  const [coverProgress, setCoverProgress] =
    useState(0);
  const [videoProgress, setVideoProgress] =
    useState(0);

  const [permissions, setPermissions] = useState({
    allow_reels: false,
    allow_videos: true,
  });

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    load();
  }, [communityId]);

  const load = async () => {
    try {
      const data = await apiRequest(
        `api/communities/${communityId}/settings/`
      );

      setCommunity(data);

      setPermissions(
        data.permissions || {
          allow_reels: false,
          allow_videos: true,
        }
      );

      setCoverUrl(
        data.cover_image_url || ""
      );
      setVideoUrl(
        data.intro_video_url || ""
      );
      setCoverAssetId(
        data.cover_image_asset_id || null
      );
      setVideoAssetId(
        data.intro_video_asset_id || null
      );

    } catch (error) {
      console.error(
        "Failed to load community settings:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (
        community.cover_image_url?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          community.cover_image_url
        );
      }

      if (
        community.intro_video_url?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          community.intro_video_url
        );
      }
    };
  }, []);

  async function deleteCommunity(
    id: number
  ) {
    const ok = window.confirm(
      "Delete this community?"
    );

    if (!ok) return;

    try {
      await apiRequest(
        `api/communities/${id}/delete/`,
        {
          method: "DELETE",
        }
      );

      replace("/main/tribe");

    } catch (err) {
      console.error(err);
    }
  }

  const updateSettings = async () => {
    try {
      setSaving(true);
      console.log("COMMUNITY MEDIA IDS:", {
        coverAssetId,
        videoAssetId,
      });

      await apiRequest(
        `api/communities/${communityId}/settings/`,
        {
          method: "PATCH",
          data: {
            name: community.name,
            description: community.description,

            cover_image_asset_id: coverAssetId,
            intro_video_asset_id: videoAssetId,

            rules: community.rules || "",
            website: community.website,

            require_post_approval:
              community.require_post_approval,

            join_approval_required:
              community.join_approval_required,

            allow_videos:
              permissions.allow_videos,
          },
        }
      );

      replace(
        `/main/community/${communityId}`
      );

    } catch (err) {
      console.error(
        "Failed to save community settings:",
        err
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const previousVideo =
      videoUrl || community.intro_video || "";

    const previewUrl =
      URL.createObjectURL(file);

    setVideoFile(file);

    // Keep local preview
    setCommunity((prev: any) => ({
      ...prev,
      intro_video_url: previewUrl,
    }));

    setVideoUploading(true);
    setVideoProgress(0);

    try {
      const uploaded = await uploadMediaResumable({
        file,
        onProgress: setVideoProgress,
      });
    
      const uploadedUrl = Array.isArray(uploaded?.original_url)
        ? uploaded?.original_url[0] ?? ""
        : uploaded?.original_url;
      
      if (!uploadedUrl) {
        throw new Error(
          "Video upload did not return a valid URL."
        );
      }
      
      setVideoAssetId(
        uploaded.media_id != null
          ? String(uploaded.media_id)
          : null
      );
    
      setVideoUrl(uploadedUrl);
    
      setCommunity((prev: any) => ({
        ...prev,
        intro_video_url: uploadedUrl,
      }));
    
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      console.error(
        "Community intro video upload failed:",
        error
      );

      URL.revokeObjectURL(previewUrl);

      setCommunity((prev: any) => ({
        ...prev,
        intro_video_url: previousVideo,
      }));

      setVideoProgress(0);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to upload intro video."
      );

    } finally {
      setVideoUploading(false);
      setVideoFile(null);
    }

    e.target.value = "";
  };

  const handleCoverUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const previousCover =
      coverUrl ||
      community.cover_image_url ||
      "";

    const previewUrl =
      URL.createObjectURL(file);

    setCoverFile(file);

    // Keep local preview
    setCommunity((prev: any) => ({
      ...prev,
      cover_image_url: previewUrl,
    }));

    setCoverUploading(true);
    setCoverProgress(0);

    try {
      const uploaded = await uploadMedia(
        file,
        setCoverProgress
      );
  
      const uploadedUrl = Array.isArray(uploaded?.original_url)
        ? uploaded?.original_url[0] ?? ""
        : uploaded?.original_url;
      
      if (!uploadedUrl) {
        throw new Error(
          "Cover upload did not return a valid URL."
        );
      }
    
      setCoverAssetId(
        uploaded.media_id != null
          ? String(uploaded.media_id)
          : null
      );
    
      setCoverUrl(uploadedUrl);
    
      setCommunity((prev: any) => ({
        ...prev,
        cover_image_url: uploadedUrl,
      }));
      
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      console.error(
        "Community cover upload failed:",
        error
      );

      URL.revokeObjectURL(previewUrl);

      setCommunity((prev: any) => ({
        ...prev,
        cover_image_url: previousCover,
      }));

      setCoverProgress(0);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to upload cover image."
      );

    } finally {
      setCoverUploading(false);
      setCoverFile(null);
    }

    e.target.value = "";
  };

  if (loading) {
    return <Skeleton />;
  }

  return (
    <div className="max-w-xl text-gray-600 dark:text-gray-300 mx-auto my-20 p-4 space-y-4">

      <h1 className="text-2xl text-gray-700 dark:text-white font-bold">
        Community Settings
      </h1>

      {/* INTRO VIDEO */}

      <div className="flex items-center gap-3 mt-4">

        <div className="relative h-72 w-full overflow-hidden border bg-black rounded-lg">

          {community.intro_video_url && (
            <video
              ref={videoRef}
              src={community.intro_video_url}
              autoPlay
              muted={isMuted}
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          )}

          <div className="absolute bottom-3 right-3 flex gap-2">

            <button
              onClick={() => {
                if (!videoRef.current) return;

                if (isPlaying) {
                  videoRef.current.pause();
                } else {
                  videoRef.current.play();
                }

                setIsPlaying(!isPlaying);
              }}
              className="bg-black/60 text-white px-3 py-1 rounded-full text-xs"
            >
              {isPlaying ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
              )}
            </button>

            <button
              onClick={() => {
                if (!videoRef.current) return;

                videoRef.current.muted =
                  !isMuted;

                setIsMuted(!isMuted);
              }}
              className="bg-black/60 text-white px-3 py-1 rounded-full text-xs"
            >
              {isMuted ? (
                <VolumeX size={14} />
              ) : (
                <Volume2 size={14} />
              )}
            </button>

            <button
              onClick={() => {
                if (!videoRef.current) return;

                videoRef.current.currentTime = 0;

                videoRef.current.play();

                setIsPlaying(true);
              }}
              className="bg-black/60 text-white px-3 py-1 rounded-full text-xs"
            >
              <Repeat size={14} />
            </button>

          </div>
        </div>

        <label
          className={`cursor-pointer p-2 bg-indigo-600 text-white rounded-full ${
            videoUploading
              ? "opacity-50 pointer-events-none"
              : ""
          }`}
        >
          +

          <input
            type="file"
            hidden
            accept="video/*"
            disabled={videoUploading}
            onChange={handleVideoUpload}
          />
        </label>

      </div>

      {videoProgress > 0 &&
        videoProgress < 100 && (
          <div className="mt-2">
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{
                  width: `${videoProgress}%`,
                }}
              />
            </div>

            <p className="text-xs mt-1 text-center">
              Uploading video...{" "}
              {videoProgress}%
            </p>
          </div>
        )}

      {/* COVER */}

      <div className="flex items-center gap-3">

        <div className="relative w-16 h-16">

          {coverProgress > 0 &&
            coverProgress < 100 && (
              <svg
                className="absolute inset-0 -rotate-90"
                width="64"
                height="64"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="30"
                  stroke="#d1d5db"
                  strokeWidth="4"
                  fill="none"
                />

                <circle
                  cx="32"
                  cy="32"
                  r="30"
                  stroke="#4f46e5"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={188.5}
                  strokeDashoffset={
                    188.5 -
                    (188.5 *
                      coverProgress) /
                      100
                  }
                />
              </svg>
            )}

          {community.cover_image_url ? (
            <img
              src={community.cover_image_url}
              alt="Community cover"
              className="w-16 h-16 rounded-full object-cover border"
            />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}

        </div>

        <label
          className={`cursor-pointer p-2 bg-indigo-600 text-white rounded-full ${
            coverUploading
              ? "opacity-50 pointer-events-none"
              : ""
          }`}
        >
          +

          <input
            type="file"
            hidden
            accept="image/*"
            disabled={coverUploading}
            onChange={handleCoverUpload}
          />
        </label>

      </div>

      {/* NAME */}

      <div>
        <p className="text-xl font-medium text-gray-700 dark:text-white">
          Name
        </p>

        <input
          value={community.name || ""}
          onChange={(e) =>
            setCommunity({
              ...community,
              name: e.target.value,
            })
          }
          className="w-full bg-indigo-200 text-gray-700 dark:text-white dark:bg-indigo-900 p-2 border rounded"
        />
      </div>

      {/* DESCRIPTION */}

      <div>
        <p className="text-xl font-medium text-gray-700 dark:text-white">
          Description
        </p>

        <textarea
          value={community.description || ""}
          onChange={(e) =>
            setCommunity({
              ...community,
              description: e.target.value,
            })
          }
          className="w-full bg-indigo-200 text-gray-700 dark:text-white dark:bg-indigo-900 p-2 border rounded"
        />
      </div>
  
      {/* COMMUNITY RULES */}

      <div>
        <p className="text-xl font-medium text-gray-700 dark:text-white">
          Community Rules
        </p>
      
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Write one rule per line. Numbering will be added automatically.
        </p>
      
        <textarea
          value={community.rules || ""}
          onChange={(e) =>
            setCommunity({
              ...community,
              rules: e.target.value,
            })
          }
          placeholder={`Be respectful to other members.
      No spam or self-promotion.
      Keep discussions relevant.`}
          rows={6}
          className="w-full bg-indigo-200 text-gray-700 dark:text-white dark:bg-indigo-900 p-2 border rounded"
        />
      </div>

      {/* WEBSITE */}

      <div>
        <p className="text-xl font-medium text-gray-700 dark:text-white">
          Website
        </p>

        <input
          value={community.website || ""}
          onChange={(e) =>
            setCommunity({
              ...community,
              website: e.target.value,
            })
          }
          className="w-full bg-indigo-200 text-gray-700 dark:text-white dark:bg-indigo-900 p-2 border rounded"
        />
      </div>

      {/* APPROVAL */}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={
            !!community.require_post_approval
          }
          onChange={(e) =>
            setCommunity({
              ...community,
              require_post_approval:
                e.target.checked,
            })
          }
        />

        Require Post Approval
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={
            !!community.join_approval_required
          }
          onChange={(e) =>
            setCommunity({
              ...community,
              join_approval_required:
                e.target.checked,
            })
          }
        />

        Require Join Approval
      </label>

      {/* VIDEO / REELS */}

      {permissions.allow_reels && (
        <label className="flex items-center gap-2">

          <input
            type="checkbox"
            checked={
              permissions.allow_videos
            }
            onChange={(e) => {
              if (e.target.checked) {
                setPendingValue(true);
                setShowMediaWarning(true);
              } else {
                setPermissions({
                  ...permissions,
                  allow_videos: false,
                });
              }
            }}
          />

          Allow Videos Instead of Reels

        </label>
      )}

      {/* OWNER */}

      <p className="dark:text-gray-200 text-gray-700">
        Owner: {community.owner?.username}
      </p>

      {/* ADMIN */}

      <p className="dark:text-gray-200 text-gray-700">
        Admin: {community.admin?.username}
      </p>

      {/* MODERATORS */}

      <div>
        <h3 className="dark:text-gray-200 text-gray-700">
          Moderators (
          {community.moderators?.length || 0}
          /5)
        </h3>

        {community.moderators?.map(
          (m: any) => (
            <div
              className="dark:text-gray-400 text-gray-500"
              key={m.id}
            >
              {m.username}
            </div>
          )
        )}
      </div>

      {/* SAVE */}

      <button
        onClick={updateSettings}
        disabled={
          saving ||
          coverUploading ||
          videoUploading
        }
        className={`w-full p-2 rounded text-white transition ${
          saving ||
          coverUploading ||
          videoUploading
            ? "bg-blue-400 cursor-not-allowed"
            : "bg-blue-500"
        }`}
      >
        {coverUploading
          ? `Uploading Cover... ${coverProgress}%`
          : videoUploading
          ? `Uploading Video... ${videoProgress}%`
          : saving
          ? "Saving..."
          : "Save Changes"}
      </button>

      {/* DELETE */}

      <button
        onClick={() =>
          deleteCommunity(
            community.id
          )
        }
        className="bg-red-500 text-white w-full p-2 rounded"
      >
        Delete Community
      </button>

      {/* MEDIA WARNING */}

      <PermanentMediaTypeModal
        open={showMediaWarning}
        onCancel={() => {
          setShowMediaWarning(false);
          setPendingValue(false);
        }}
        onConfirm={() => {
          setPermissions({
            ...permissions,
            allow_videos: pendingValue,
          });

          setShowMediaWarning(false);
        }}
      />

    </div>
  );
}