'use client';
import { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import {
  saveAutoPostDraft,
  saveManualPostDraft,
  getPostDraft,
  deletePostDraft,
  getAllPostDrafts,
} from "@/lib/messageDB";
import ButtonLoader from "@/components/ButtonLoader";
import Skeleton from '@/components/Skeleton';
import { apiRequest } from '@/utils/api';
import { uploadToCloudinary } from '@/utils/cloudinary';

type ExistingVideo = {
  url: string;
  thumbnail?: string;
};

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const searchParams = useSearchParams();
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const draftId = searchParams.get("draftId");
  const [imageFiles, setImageFiles] = useState<(File | string)[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [video, setVideo] = useState<
    File | ExistingVideo | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const { push } = useNavigation()
  const isEdit = searchParams.get('edit') === 'true';
  const postId = searchParams.get('postId');
  const modeParam = searchParams.get('mode');
  const [draftCount, setDraftCount] = useState(0);

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
  const isCommunityPost = !!selectedCommunity;
  
  const [communityData, setCommunityData] = useState<any>(null);
  const [permissions, setPermissions] = useState({
    allow_reels: false,
    allow_videos: false,
  });
  const isGlobal = mode === 'global';
  const isCommunity = mode === 'community';
  const isReel = mode === 'reel';
  
  const allowReel = permissions.allow_reels;
  const allowVideo = isGlobal || permissions.allow_videos;
  const allowImages = true;

  const MAX_IMAGES = 5;

  useEffect(() => {
    const loadCount = async () => {
      const drafts = await getAllPostDrafts();
      setDraftCount(drafts.length);
    };
  
    loadCount();
  }, []);

  useEffect(() => {
      if (isEdit || draftId) return;
  
      const timer = setTimeout(async () => {
          await saveAutoPostDraft({
              draftId: selectedCommunity
                  ? `auto-community-${selectedCommunity}`
                  : "auto-global",
  
              title: selectedCommunity
                ? `${communityData?.tribe?.name} • ${communityData?.name}`
                : "Global Post",
  
              content,
  
              imageFiles,
  
              imageUrls,
  
              video,
  
              selectedCommunity,
  
              communityName:
                  communityData?.name || "",
          });
      }, 1000);
  
      return () => clearTimeout(timer);
  }, [
      content,
      imageFiles,
      imageUrls,
      video,
      selectedCommunity,
      communityData,
  ]);

  useEffect(() => {

      if (isEdit) return;
  
      const load = async () => {
  
          const id =
              draftId ??
              (
                  selectedCommunity
                      ? `auto-community-${selectedCommunity}`
                      : "auto-global"
              );
  
          const draft = await getPostDraft(id);
  
          if (!draft) return;
  
          setContent(draft.content || "");
  
          setImageFiles(draft.imageFiles || []);
  
          setImageUrls(draft.imageUrls || []);
  
          setVideo(draft.video || null);
  
          setSelectedCommunity(
              draft.selectedCommunity || null
          );
      };
  
      load();
  
  }, [draftId]);
  
  const handleSaveDraft = async () => {

      await saveManualPostDraft({
  
          title: selectedCommunity
            ? `${communityData?.tribe?.name} • ${communityData?.name}`
            : "Global Post",
  
          communityName:
              communityData?.name || "",
  
          content,
  
          imageFiles,
  
          imageUrls,
  
          video,
  
          selectedCommunity,
      });
  
      const drafts = await getAllPostDrafts();
      setDraftCount(drafts.length);
  
      toast.success("Draft saved");
  };

  useEffect(() => {
    setImageUrls([]);
    setImageFiles([]);
    setVideo(null);
  }, [selectedCommunity]);

  // Handle adding images
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!allowImages) return;

    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length + imageFiles.length > MAX_IMAGES) {
      alert(`You can only upload up to ${MAX_IMAGES} images`);
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
    setVideo(null); 
  };

  // Handle video selection (max 1)
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
  
    if (allowReel) {
      // ✅ ONLY REELS
      setVideo(file);
      setImageFiles([]);
      setImageUrls([]);
      return;
    }
  
    if (!allowVideo) {
      alert("Video not allowed here");
      return;
    }
  
    setVideo(file);
    setImageUrls([]);
    setImageFiles([]);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => setVideo(null);
  
  // =============================
  // 🔥 EDIT MODE LOAD
  // =============================
  useEffect(() => {
    if (!isEdit || !postId) return;
  
    const fetchPost = async () => {
      try {
        const data = await apiRequest(`api/post/${postId}/`);
  
        setContent(data.caption || "");
  
        if (data.media_files?.length) {
          let imageUrls: string[] = [];
  
          data.media_files.forEach((m: any) => {
            if (m.media_type === "video") {
              setVideo({
                url: m.file_url,
                thumbnail: m.thumbnail_url,
              });
            } else if (m.media_type === "image") {
              imageUrls.push(m.file_url);
            }
          });
  
          setImageUrls(imageUrls);
        }
  
        setSelectedCommunity(data.community);
  
      } catch (err) {
        console.error("Failed to fetch post", err);
      }
    };
  
    fetchPost();
  }, [isEdit, postId]);

  const handlePost = async () => {
    if (!content.trim() && imageFiles.length === 0 && !video) return;
    if ((mode === "community" || mode === "reel") && !selectedCommunity) {
      alert("Please select a community");
      return;
    }

    setLoading(true);
    setFileProgress({});
  
    try {
      let mediaUrls: any[] = [];

      const filesToUpload = [
          ...imageFiles.filter(
              (i): i is File => i instanceof File
          ),
      
          ...(video instanceof File ? [video] : []),
      ];

      for (let file of filesToUpload) {
        const url = await uploadToCloudinary({
          file,
          onProgress: (percent) => {
            setFileProgress((prev) => ({ ...prev, [file.name]: percent }));
          },
        });
        mediaUrls.push({
          url,
          type: file.type.startsWith("video") ? "video" : "image",
          thumbnail: file.type.startsWith("video")
            ? url.replace("/upload/", "/upload/so_0,w_300,h_300,c_fill/")
            : null
        });
      }
      
      const existingMedia = [
        ...imageFiles.filter(i => typeof i === "string").map(url => ({ url, type: "image" })),
        ...(video &&
          typeof video !== "string" &&
          !(video instanceof File)
            ? [{
                url: video.url,
                type: "video",
                thumbnail: video.thumbnail,
              }]
            : [])
      ];

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
      
      const payload = {
        caption: content,
        content_type: contentType,
        media_files: [...existingMedia, ...mediaUrls],
        community: selectedCommunity,
      };
  
      let newPost = null;

      if (isEdit) {
        await apiRequest(`api/post/${postId}/`, {
          method: "PUT",
          data: payload,
        });
  
        toast.success("Post updated!");
      } else {
        newPost = await apiRequest(`api/post/`, {
          method: "POST",
          data: payload,
        });
  
        toast.success("Post created!");
      }
  
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

      if (newPost.is_approved) {
          sessionStorage.setItem(
              "new_post",
              JSON.stringify(newPost)
          );
      } else {
          toast.success("Post submitted for approval.");
      }

      push("/main/home");
    } catch (err:any) {
      console.log("FULL ERROR:", err.data || err);
      console.error(err);
      toast.error('Failed to create post');
      setFileProgress({});
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!selectedCommunity) return;

    const fetchCommunity = async () => {
        try {
            setLoadingCommunity(true);

            const data = await apiRequest(
                `api/communities/${selectedCommunity}/`
            );

            setCommunityData(data);
            setPermissions(data.permissions);
            setMode(
              data.permissions.allow_reels
                ? "reel"
                : "community"
            );

        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCommunity(false);
        }
    };

    fetchCommunity();
  }, [selectedCommunity]);
  
  // Render individual progress bar
    const renderProgressBar = (file: File) => {
      const progress = fileProgress[file.name] || 0;
      return (
        <div key={file.name} className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      );
    };
  
  if (loadingCommunity) {
    return <Skeleton />;
  }
  
  if (
    loading &&
    !video &&
    imageFiles.length === 0 &&
    imageUrls.length === 0
  ) return <Skeleton onComplete={() => setLoading(false)} />;

  return (
    <div className="max-w-3xl mx-auto p-4 my-20 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{allowReel
        ? `Create ${communityData?.tribe?.name} Post`
        : selectedCommunity ? "Create Community Post"
        : isEdit ? "Edit Post" 
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
        <AppLink href="/main/draft" className="absolute top-36 right-10 border rounded-xl text-sm p-3 text-gray-700 dark:text-gray-200 font-bold mb-6">
          Drafts • {draftCount}
        </AppLink>

        {/* Textarea */}
        <textarea
          placeholder="What's happening in your tribe?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={4}
        />

        {/* Images Preview */}
        {imageFiles.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {imageFiles.map((file, idx) => (
              <div key={idx} className="relative group">
                <img
                  alt={`preview-${idx}`}
                  src={
                      file instanceof File
                          ? URL.createObjectURL(file)
                          : file
                  }
                  className="w-full h-24 object-cover rounded-lg"
              />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-80 hover:opacity-100 transition"
                  title="Remove image"
                >
                  ×
                </button>
                {file instanceof File && loading && renderProgressBar(file)}
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
                  ? URL.createObjectURL(video)
                  : video?.url
              }
              poster={
                video instanceof File
                  ? undefined
                  : video?.thumbnail
              }
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
          <label
            className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed p-2 rounded-lg cursor-pointer transition 
            ${!allowImages ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500'}`}
          >
            <span className="text-gray-500 dark:text-gray-400 text-sm">Add Images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className="hidden"
              disabled={!!video}
            />
          </label>

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