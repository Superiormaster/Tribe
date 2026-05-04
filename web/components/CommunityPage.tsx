"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PostCard from "./PostCard";
import CreateCommunity from "./CreateCommunity";
import { Search } from "lucide-react";
import CommunityChat from "./CommunityChat";
import { MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from "@/utils/api";

export default function CommunityPage({ communityId, user }: any) {
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [community, setCommunity] = useState<any>({});
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const isOwner = user?.id === community?.owner?.id;
  const isAdmin = community?.my_role === "admin";
  const canManage = isOwner || isAdmin;

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!communityId) return;

    fetchCommunity();
    fetchMembers();
    fetchPosts(true);
    fetchPendingPosts();
    fetchPinnedPosts();
  }, [communityId]);

  // 🔥 Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 200 >=
        document.documentElement.scrollHeight
      ) {
        if (!loading && hasMore && activeTab === "posts") {
          fetchPosts();
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore, activeTab]);

  const fetchPinnedPosts = async () => {
    const data = await apiRequest(
      `api/post/?community=${communityId}`
    );
  
    const posts = data.results || data;
    const pinned = posts.filter((p: any) => p.is_pinned);
  
    setPinnedPosts(pinned);
  };
  
  const fetchCommunity = async () => {
    const data = await apiRequest(`api/communities/${communityId}/`);
    setCommunity(data);
  };

  const fetchMembers = async () => {
    const data = await apiRequest(`api/communities/${communityId}/members/`);
    setMembers(data);
  };

  const fetchPosts = async (reset = false) => {
    if (!hasMore && !reset) return;

    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;

      const data = await apiRequest(
        `api/post/?community=${communityId}&page=${currentPage}`
      );

      const newPosts = data.results || data;

      setPosts(prev => (reset ? newPosts : [...prev, ...newPosts]));
      setHasMore(newPosts.length > 0);
      setPage(prev => (reset ? 2 : prev + 1));
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPosts = async () => {
    const data = await apiRequest(
      `api/post/?community=${communityId}&is_approved=false`
    );
    setPendingPosts(data.results || data);
  };
  
  const handleJoin = async () => {
    // optimistic update
    setCommunity((prev: any) => ({
      ...prev,
      joined: true,
    }));
  
    try {
      await apiRequest(`api/communities/${communityId}/join/`, {
        method: "POST",
      });
    } catch (err) {
      // rollback
      setCommunity((prev: any) => ({
        ...prev,
        joined: false,
      }));
    }
  };

  const handleLeave = async () => {
    setCommunity((prev: any) => ({
      ...prev,
      joined: false,
    }));
  
    try {
      await apiRequest(`api/communities/${communityId}/leave/`, "POST");
    } catch (err) {
      setCommunity((prev: any) => ({
        ...prev,
        joined: true,
      }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 mt-8">
      {/* 🔥 COMMUNITY HEADER */}
      <div className="relative w-full rounded-xl overflow-hidden h-72">
        {/* 🔥 INTRO VIDEO BACKGROUND */}
        {community.intro_video && (
          <video
            src={community.intro_video}
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
            autoPlay
            loop
            muted
            playsInline
          />
        )}
      
        {/* 🔥 OVERLAY for darker text visibility */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/25 z-10"></div>
      
        {/* 🔥 COVER IMAGE / AVATAR */}
        <div className="absolute top-4 left-4 w-24 h-24 rounded-full border-4 border-white overflow-hidden z-20">
          {community.cover_image ? (
            <img
              src={community.cover_image}
              alt={community.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white text-xl">
              {community.name?.[0] || "C"}
            </div>
          )}
        </div>
      
        {/* 🔥 Community info */}
        <div className="absolute bottom-4 left-4 z-20">
          <h1 className="text-3xl text-gray-700 dark:text-gray-100 font-bold">{community.name}</h1>
          <p className="text-sm text-gray-700 dark:text-gray-300">{community.description}</p>
          <div className="flex items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-100 opacity-80">{members.length} members</span>
        
              {community.joined ? (
                <button
                  onClick={handleLeave}
                  className="px-3 py-1 bg-red-500 text-white rounded-full text-sm"
                >
                  Leave
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm"
                >
                  Join
                </button>
              )}
        
              <button
                onClick={() => router.push("/main/search")}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-white"
              >
                <Search size={18} />
              </button>
              <button className="text-xs px-2 py-1 flex-1 bg-yellow-500 text-black rounded">
                Invite
              </button>
            </div>
            <button
              onClick={() => router.push(`/main/community/${communityId}/settings`)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <MoreVertical />
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 CREATE POST */}
      {user && (
        <div className="flex items-center gap-3 px-1 pt-2">
          <Link href={`/main/profile/${user.username}`} className="flex items-center gap-2">
            {user.avatar ? (
              <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover" />
            ) : (
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                {user.email?.slice(0, 2).toUpperCase() || '??'}
              </div>
            )}
          </Link>
          <div
            onClick={() =>
              router.push(`/main/create-post?communityId=${communityId}`)
            }
            className="p-2 flex-1 rounded-xl bg-gray-100 text-gray-500 dark:text-gray-400 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 cursor-pointer"
          >
            What's happening in this community?
          </div>
        </div>
      )}

      {/* 🔥 TABS */}
      <div className="flex overflow-x-auto gap-3">
        {["posts", "pending", "members"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded ${
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 dark:text-gray-300 dark:bg-gray-800"
            }`}
          >
            {tab.replace("-", " ")}
          </button>
        ))}
        <button
          onClick={() => router.push(`/main/community/${communityId}/chat`)}
          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
        >
          Chat
        </button>
      </div>

      {activeTab === "posts" && pinnedPosts.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold px-2 mb-2">📌 Pinned</h2>
          {pinnedPosts.map((post: any) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* POSTS */}
      {activeTab === "posts" && posts.map((post: any, index) =>
          post.content_type === "short_video" ? (
            <ReelCard key={post.id} post={post} />
          ) : (
            <div key={post.id}>
              <PostCard post={post} />
  
              {index % 4 === 3 && (
                <div className="p-3 bg-gray-700 mt-5 dark:bg-zinc-800 rounded-xl">
                  🔥 Suggested Communities
                </div>
              )}
            </div>
          )
        )
      }

      {/* PENDING */}
      {activeTab === "pending" &&
        pendingPosts.map((post: any) =>
          post.content_type === "short_video" ? (
            <ReelCard key={post.id} post={post} />
          ) : (
            <PostCard
              key={post.id}
              post={post}
            />
          )
        )
      }

      {/* MEMBERS */}
      {activeTab === "members" &&
        members.map((m: any) => (
          <div key={m.id} className="flex justify-between items-center p-2 border-b">
              {m.avatar ? (
                <img src={m.avatar} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                  {m.email?.slice(0, 2).toUpperCase() || '??'}
                </div>
              )}
            <span>
              {m.username}
              <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">
                {m.role}
              </span>
            </span>

            {user?.id === community.owner?.id && (
              <div className="flex gap-2">
                {m.role !== "admin" && (
                  <button className="text-xs px-2 py-1 bg-blue-500 text-white rounded">
                    Make Admin
                  </button>
                )}
                <button className="text-xs px-2 py-1 bg-red-500 text-white rounded">
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}


function ReelCard({ post }: any) {
  const router = useRouter();
  
  const goToReel = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // safety
    router.push(`/main/reels/${post.id}`);
  };
  
  const poster =
    post.media_files?.find((m: any) => m.thumbnail_url)?.thumbnail_url ||
    post.media_files?.[0]?.thumbnail_url ||
    '';

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-xl bg-black">

      {/* Video Preview (no controls, no autoplay) */}
      <video
        src={post.media_files?.[0]?.file_url}
        poster={poster}
        preload="metadata"
        className="w-full h-full object-cover"
        muted
        playsInline
      />

      {/* ▶️ Play Button → REDIRECT */}
      <button
        onClick={goToReel}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="bg-black/60 p-4 rounded-full text-white text-xl">
          ▶
        </div>
      </button>

      {/* Caption */}
      {post.caption && (
        <div className="absolute bottom-3 left-3 right-3 text-white text-sm font-medium line-clamp-2">
          {post.caption}
        </div>
      )}
    </div>
  );
}