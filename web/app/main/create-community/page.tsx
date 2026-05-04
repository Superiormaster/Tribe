'use client';
import { useState, useEffect, useRef } from 'react';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { useSearchParams, useRouter } from "next/navigation";
import { apiRequest } from '@/utils/api';

type Props = { 
  onCreated?: () => void;
  user: any;
};

export default function CreateCommunity({ onCreated, user }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverProgress, setCoverProgress] = useState(0);
  const searchParams = useSearchParams();
  const tribeIdParam = searchParams.get("tribe");
  const tribeId = tribeIdParam ? Number(tribeIdParam) : null;
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [requireApproval, setRequireApproval] = useState(false);
  const [tribes, setTribes] = useState<{ id: number; name: string }[]>([]);
  const [tribeName, setTribeName] = useState("");
  const [selectedTribe, setSelectedTribe] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch all tribes for selection
  useEffect(() => {
    if (tribeId) setSelectedTribe(tribeId);
  }, [tribeId]);
  
  useEffect(() => {
    if (tribeId) {
      apiRequest(`api/tribes/${tribeId}/`).then((data) => {
        setTribeName(data.name);
      });
    }
  }, [tribeId]);

  // Handle cover image selection
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverProgress(0);
  };

  // Handle intro video selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setVideoProgress(0);
  };
  
  const normalize = (data: any) => {
    if (Array.isArray(data)) return data;
    if (data?.results) return data.results;
    return [];
  };
  
  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);

    try {
      // Upload files with progress
      let coverUrl: string | null = null;
      let videoUrl: string | null = null;

      if (coverFile) {
        coverUrl = await uploadToCloudinary({
          file: coverFile,
          folder: 'Tribe/Communities/Covers',
          onProgress: (percent) => setCoverProgress(percent),
        });
      }

      if (videoFile) {
        videoUrl = await uploadToCloudinary({
          file: videoFile,
          folder: 'Tribe/Communities/Videos',
          onProgress: (percent) => setVideoProgress(percent),
        });
      }

      const payload: any = {
        name,
        description,
        require_post_approval: requireApproval,
        tribe: selectedTribe,
      };
      if (coverUrl) payload.cover_image = coverUrl;
      if (videoUrl) payload.intro_video = videoUrl;
      if (selectedTribe) payload.tribe = selectedTribe;

      const createdCommunity = await apiRequest('api/communities/', {
        method: 'POST',
        data: payload,
      });

      // Redirect to the new community page
      if (createdCommunity?.id) {
        router.push(`/main/community/${createdCommunity.id}`);
      }

      // Reset state
      setName('');
      setDescription('');
      setCoverFile(null);
      setCoverPreview(null);
      setCoverProgress(0);
      setVideoFile(null);
      setVideoPreview(null);
      setVideoProgress(0);
      setRequireApproval(false);
      setSelectedTribe(null);
      if (onCreated) onCreated();
    } catch (err) {
      console.error(err);
      alert('Failed to create community.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm mb-6">
      <h1 className="text-2xl text-center font-bold mb-4">Create Community in {tribeName} Tribe</h1>
      {/* Name & Description */}
      <input
        type="text"
        placeholder="Community Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      />

      {/* Modern Cover Upload */}
      <div className="flex flex-col">
        <label className="block mb-2 font-semibold">Cover Image</label>
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 transition"
          onClick={() => coverInputRef.current?.click()}
        >
          {coverPreview ? (
            <img src={coverPreview} alt="Cover Preview" className="mx-auto rounded-lg h-48 object-cover" />
          ) : (
            <p className="text-gray-500">Click or drag image here to upload</p>
          )}
        </div>
        {coverProgress > 0 && coverProgress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${coverProgress}%` }}
            />
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

      {/* Modern Intro Video Upload */}
      <div className="flex flex-col">
        <label className="block mb-2 font-semibold">Intro Video</label>
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 transition"
          onClick={() => videoInputRef.current?.click()}
        >
          {videoPreview ? (
            <video src={videoPreview} controls className="mx-auto rounded-lg h-48" />
          ) : (
            <p className="text-gray-500">Click or drag video here to upload</p>
          )}
        </div>
        {videoProgress > 0 && videoProgress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${videoProgress}%` }}
            />
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

      {/* Require Approval */}
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={requireApproval}
          onChange={(e) => setRequireApproval(e.target.checked)}
          className="mr-2"
        />
        Require post approval
      </label>

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {loading ? 'Creating...' : 'Create Community'}
      </button>

      {/* Admin Panel - Only for owner */}
      {user?.role === 'owner' && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="font-bold mb-2">Admin Panel</h3>
          <button className="px-3 py-2 bg-red-600 text-white rounded-lg">Delete Community</button>
          <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg ml-2">Manage Moderators</button>
        </div>
      )}
    </div>
  );
}