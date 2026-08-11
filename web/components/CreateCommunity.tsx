"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiRequest } from "@/utils/api";
import {normalizeWebsite} from "@/utils/normalizeWebsite";
import { uploadMediaResumable } from "@/utils/mediaUpload/uploadMediaResumable";
import { uploadMedia } from "@/utils/mediaUpload/uploadMedia";
import { useNavigation } from "@/utils/useNavigation";

type Props = {
  onCreated?: () => void;
  user: any;
};

export default function CreateCommunity({
  onCreated,
  user,
}: Props) {
  const { replace } = useNavigation();
  const searchParams = useSearchParams();

  const tribeIdParam = searchParams.get("tribe");
  const tribeId = tribeIdParam ? Number(tribeIdParam) : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  const [requireApproval, setRequireApproval] = useState(false);
  const [joinApprovalRequired, setJoinApprovalRequired] = useState(false);

  const [tribeName, setTribeName] = useState("");
  const [selectedTribe, setSelectedTribe] =
    useState<number | null>(null);

  const [coverFile, setCoverFile] =
    useState<File | null>(null);

  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  const [coverProgress, setCoverProgress] = useState(0);
  const [coverUploading, setCoverUploading] = useState(false);

  const [videoFile, setVideoFile] =
    useState<File | null>(null);

  const [videoPreview, setVideoPreview] =
    useState<string | null>(null);

  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tribeId) {
      setSelectedTribe(tribeId);
    }
  }, [tribeId]);

  useEffect(() => {
    if (!tribeId) return;

    const loadTribe = async () => {
      try {
        const data = await apiRequest(
          `api/tribes/${tribeId}/`
        );

        setTribeName(data?.name || "");
      } catch (err) {
        console.error("Failed to load tribe:", err);
      }
    };

    loadTribe();
  }, [tribeId]);

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }

      if (videoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [coverPreview, videoPreview]);

  const handleCoverChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");

    if (coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setCoverFile(file);
    setCoverPreview(previewUrl);
    setCoverProgress(0);
  };

  const handleVideoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");

    if (videoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(videoPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setVideoFile(file);
    setVideoPreview(previewUrl);
    setVideoProgress(0);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Community name is required.");
      return;
    }

    if (!selectedTribe) {
      setError("Please select a tribe.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError("");

    let uploadedCoverAssetId: string | null = null;
    let uploadedVideoAssetId: string | null = null;

    try {

      if (coverFile) {
        setCoverUploading(true);
        setCoverProgress(0);
      
        const uploaded = await uploadMedia(
          coverFile,
          setCoverProgress
        );
      
        if (!uploaded?.original_url) {
          throw new Error(
            "Cover image upload failed."
          );
        }
      
        uploadedCoverAssetId =
          uploaded.media_id != null
            ? String(uploaded.media_id)
            : null;
      
        setCoverProgress(100);
      }

      if (videoFile) {
        setVideoUploading(true);
        setVideoProgress(0);
      
        console.log("VIDEO UPLOAD START");

        const uploaded = await uploadMediaResumable({
          file: videoFile,
          onProgress: setVideoProgress,
        });
  
        console.log("VIDEO UPLOAD FINISHED:", uploaded);
      
        if (!uploaded?.original_url) {
          throw new Error(
            "Intro video upload failed."
          );
        }
      
        uploadedVideoAssetId =
          uploaded.media_id != null
            ? String(uploaded.media_id)
            : null;
      
        setVideoProgress(100);
      }

      const payload: any = {
        name: name.trim(),
      
        description:
          description.trim(),
      
        website: normalizeWebsite(website),
      
        require_post_approval:
          requireApproval,
      
        join_approval_required:
          joinApprovalRequired,
      
        tribe: selectedTribe,
      };
      
      if (uploadedCoverAssetId) {
        payload.cover_image_asset_id =
          uploadedCoverAssetId;
      }
      
      if (uploadedVideoAssetId) {
        payload.intro_video_asset_id =
          uploadedVideoAssetId;
      }

      console.log(
        "Creating community with media:",
        payload
      );

      console.log("ABOUT TO CREATE COMMUNITY");
      const createdCommunity = await apiRequest(
        "api/communities/",
        {
          method: "POST",
          data: payload,
        }
      );
      console.log("COMMUNITY CREATED:", createdCommunity);

      if (createdCommunity?.id) {
        replace(
          `/main/community/${createdCommunity.id}`
        );
      }

      if (coverPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }

      if (videoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(videoPreview);
      }

      setName("");
      setDescription("");
      setWebsite("");

      setCoverFile(null);
      setCoverPreview(null);
      setCoverProgress(0);

      setVideoFile(null);
      setVideoPreview(null);
      setVideoProgress(0);

      setRequireApproval(false);
      setJoinApprovalRequired(false);

      setSelectedTribe(null);

      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }

      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }

      onCreated?.();

    } catch (err: any) {
      console.error(
        "Failed to create community:",
        err
      );

      if (!navigator.onLine) {
        setError(
          "No internet connection. Please check your connection and try again."
        );
      } else {
        setError(
          err?.message ||
            "Failed to create community. Please try again."
        );
      }
    } finally {
      setCoverUploading(false);
      setVideoUploading(false);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 my-20 text-gray-600 dark:text-gray-300 rounded-2xl shadow-sm">

      <h1 className="text-2xl text-gray-700 dark:text-gray-300 text-center font-bold mb-4">
        Create Community
        {tribeName
          ? ` in ${tribeName} Tribe`
          : ""}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Community Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
        className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) =>
          setDescription(e.target.value)
        }
        disabled={loading}
        className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        disabled={loading}
        className="w-full px-3 py-2 mb-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        placeholder="Enter community website"
      />

      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={requireApproval}
          onChange={(e) =>
            setRequireApproval(e.target.checked)
          }
          disabled={loading}
          className="mr-2"
        />
        Require post approval
      </label>

      <label className="flex items-center mb-4">
        <input
          type="checkbox"
          checked={joinApprovalRequired}
          onChange={(e) =>
            setJoinApprovalRequired(e.target.checked)
          }
          disabled={loading}
          className="mr-2"
        />
        Require join approval
      </label>

      {/* COVER */}

      <div className="flex flex-col mb-5">

        <label className="block mb-2 font-semibold">
          Cover Image
        </label>

        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 transition"
          onClick={() =>
            !loading &&
            coverInputRef.current?.click()
          }
        >
          {coverPreview ? (
            <img
              src={coverPreview}
              alt="Cover Preview"
              className="mx-auto rounded-lg h-48 w-full object-cover"
            />
          ) : (
            <p className="text-gray-500">
              Click or drag image here to upload
            </p>
          )}
        </div>

        {coverUploading && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{
                  width: `${coverProgress}%`,
                }}
              />
            </div>

            <p className="text-xs mt-1 text-center">
              Uploading cover... {coverProgress}%
            </p>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          ref={coverInputRef}
          onChange={handleCoverChange}
          className="hidden"
        />
      </div>

      {/* VIDEO */}

      <div className="flex flex-col mb-5">

        <label className="block mb-2 font-semibold">
          Intro Video
        </label>

        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 transition"
          onClick={() =>
            !loading &&
            videoInputRef.current?.click()
          }
        >
          {videoPreview ? (
            <video
              src={videoPreview}
              controls
              className="mx-auto rounded-lg h-48 w-full object-cover"
            />
          ) : (
            <p className="text-gray-500">
              Click or drag video here to upload
            </p>
          )}
        </div>

        {videoUploading && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{
                  width: `${videoProgress}%`,
                }}
              />
            </div>

            <p className="text-xs mt-1 text-center">
              Uploading intro video... {videoProgress}%
            </p>
          </div>
        )}

        <input
          type="file"
          accept="video/*"
          ref={videoInputRef}
          onChange={handleVideoChange}
          className="hidden"
        />
      </div>

      <button
        onClick={handleCreate}
        disabled={
          loading ||
          coverUploading ||
          videoUploading
        }
        className={`w-full px-4 py-2 mt-3 rounded-lg text-white transition ${
          loading ||
          coverUploading ||
          videoUploading
            ? "bg-indigo-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {coverUploading
          ? `Uploading Cover... ${coverProgress}%`
          : videoUploading
          ? `Uploading Video... ${videoProgress}%`
          : loading
          ? "Creating..."
          : "Create Community"}
      </button>

    </div>
  );
}