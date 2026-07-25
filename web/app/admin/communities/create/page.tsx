'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNavigation } from '@/utils/useNavigation';
import { apiRequest } from '@/utils/api';
import { uploadToCloudinary } from '@/utils/cloudinary';

import {
  ArrowLeft,
  Image,
  Video,
  Save,
} from 'lucide-react';

export default function CreateCommunityPage() {

  const { push, back } = useNavigation();
  const searchParams = useSearchParams();
  const tribeId = searchParams.get("tribe");

  const [tribe, setTribe] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [requireApproval, setRequireApproval] =
    useState(false);

  const [joinApprovalRequired, setJoinApprovalRequired] =
    useState(false);

  const [coverFile, setCoverFile] =
    useState<File | null>(null);

  const [videoFile, setVideoFile] =
    useState<File | null>(null);

  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  const [videoPreview, setVideoPreview] =
    useState<string | null>(null);

  const [coverProgress, setCoverProgress] =
    useState(0);

  const [videoProgress, setVideoProgress] =
    useState(0);

  const coverInputRef =
    useRef<HTMLInputElement>(null);

  const videoInputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {

    if (!tribeId) {
      push("/admin/tribes");
      return;
    }
  
    async function load() {
  
      try {
  
        const data = await apiRequest(
          `api/admin/tribes/${tribeId}/`
        );
  
        setTribe(data);
  
      } finally {
  
        setLoading(false);
  
      }
  
    }
  
    load();
  
  }, [tribeId, push]);
  
  useEffect(() => {

    async function load() {

      try {

        const data = await apiRequest(
          `api/admin/tribes/${tribeId}/`
        );

        setTribe(data);

      } finally {

        setLoading(false);

      }

    }

    load();

  }, [tribeId]);

  const handleCover = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file = e.target.files?.[0];

    if (!file) return;

    setCoverFile(file);
    setCoverPreview(
      URL.createObjectURL(file)
    );

  };

  const handleVideo = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file = e.target.files?.[0];

    if (!file) return;

    setVideoFile(file);
    setVideoPreview(
      URL.createObjectURL(file)
    );

  };

  async function createCommunity() {

    try {

      setSaving(true);

      let coverUrl: string | null = null;
      let videoUrl: string | null = null;

      if (coverFile) {

        coverUrl = await uploadToCloudinary({

          file: coverFile,

          folder:
            'Tribe/Communities/Covers',

          onProgress: setCoverProgress,

        });

      }

      if (videoFile) {

        videoUrl = await uploadToCloudinary({

          file: videoFile,

          folder:
            'Tribe/Communities/Videos',

          onProgress: setVideoProgress,

        });

      }
      
      if (!name.trim()) {
        alert("Community name is required.");
        return;
      }

      const payload: any = {

        tribe: tribeId,

        name,

        description,

        require_post_approval:
          requireApproval,

        join_approval_required:
          joinApprovalRequired,

      };

      if (coverUrl)
        payload.cover_image = coverUrl;

      if (videoUrl)
        payload.intro_video = videoUrl;

      const res = await apiRequest(
        'api/admin/communities/create/',
        {
          method: 'POST',
          data: payload,
        }
      );

      push(`/admin/tribes/${tribeId}`);

    } catch (err) {

      console.error(err);

    } finally {

      setSaving(false);

    }

  }

  if (loading) {

    return (
      <div className="p-10">
        Loading...
      </div>
    );

  }

  return (

    <div className="mx-auto max-w-4xl space-y-6 text-gray-700 dark:text-gray-200">

      <button
        onClick={back}
        className="flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="rounded-xl border bg-white dark:bg-zinc-800 p-6">

        <h1 className="text-3xl font-bold">
          Create Community
        </h1>

        <p className="mt-2 text-gray-500">

          Tribe:
          <span className="ml-2 font-semibold">
            {tribe.name}
          </span>

        </p>

      </div>
  
      <div className="rounded-xl border bg-white dark:bg-zinc-800 p-6 space-y-6">

        <div>

          <label className="mb-2 block text-sm font-medium">
            Community Name
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border p-3"
            placeholder="Enter community name"
          />

        </div>

        <div>

          <label className="mb-2 block text-sm font-medium">
            Description
          </label>

          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border p-3"
            placeholder="Describe this community..."
          />

        </div>

        <div className="space-y-3">

          <label className="flex items-center gap-3">

            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) =>
                setRequireApproval(
                  e.target.checked
                )
              }
            />

            Require post approval

          </label>

          <label className="flex items-center gap-3">

            <input
              type="checkbox"
              checked={joinApprovalRequired}
              onChange={(e) =>
                setJoinApprovalRequired(
                  e.target.checked
                )
              }
            />

            Require join approval

          </label>

        </div>

      </div>

      <div className="grid gap-6 md:grid-cols-2">

        <div className="rounded-xl border bg-white dark:bg-zinc-800 p-6">

          <div className="mb-4 flex items-center gap-2">

            <Image size={18} />

            <h2 className="font-semibold">
              Cover Image
            </h2>

          </div>

          <div
            onClick={() =>
              coverInputRef.current?.click()
            }
            className="flex h-56 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed"
          >

            {coverPreview ? (

              <img
                src={coverPreview}
                className="h-full w-full rounded-xl object-cover"
              />

            ) : (

              <p className="text-gray-500">
                Click to upload cover image
              </p>

            )}

          </div>

          {coverProgress > 0 &&
            coverProgress < 100 && (

              <div className="mt-4 h-2 w-full rounded bg-gray-200">

                <div
                  className="h-2 rounded bg-blue-600"
                  style={{
                    width: `${coverProgress}%`,
                  }}
                />

              </div>

            )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleCover}
          />

        </div>

        <div className="rounded-xl border bg-white dark:bg-zinc-800 p-6">

          <div className="mb-4 flex items-center gap-2">

            <Video size={18} />

            <h2 className="font-semibold">
              Intro Video
            </h2>

          </div>

          <div
            onClick={() =>
              videoInputRef.current?.click()
            }
            className="flex h-56 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed"
          >

            {videoPreview ? (

              <video
                src={videoPreview}
                controls
                className="h-full w-full rounded-xl"
              />

            ) : (

              <p className="text-gray-500">
                Click to upload intro video
              </p>

            )}

          </div>

          {videoProgress > 0 &&
            videoProgress < 100 && (

              <div className="mt-4 h-2 w-full rounded bg-gray-200">

                <div
                  className="h-2 rounded bg-green-600"
                  style={{
                    width: `${videoProgress}%`,
                  }}
                />

              </div>

            )}

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={handleVideo}
          />

        </div>

      </div>

      <div className="flex justify-end gap-4">

        <button
          onClick={back}
          className="rounded-lg border px-6 py-3"
        >
          Cancel
        </button>

        <button
          disabled={saving}
          onClick={createCommunity}
          className="flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-white"
        >

          <Save size={18} />

          {saving
            ? 'Creating...'
            : 'Create Community'}

        </button>

      </div>

    </div>

  );

}