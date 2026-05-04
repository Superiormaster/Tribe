"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";

import { fetchTribeData, joinCommunity, leaveCommunity } from "@/lib/API_dev";
import Skeleton from "@/components/Skeleton"; 
import LoadingSpinner from "@/components/LoadingSpinner";

interface Community {
  id: string;
  name: string;
  membersCount: number;
  cover_image: string;
  joined: boolean;
}

interface Tribe {
  id: string;
  name: string;
  description: string;
  communities: Community[];
}

export default function TribePage() {
  const { id } = useParams();
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch tribe + communities
  const loadTribe = async () => {
    if (!hasMore) return;
    setLoading(true);
    try {
      const data = await fetchTribeData(id, page);
      console.log("Fetched tribe data:", data);
  
      if (!tribe) {
        setTribe(data);
      } else {
        // Deduplicate by community id
        const existingIds = new Set(tribe.communities.map(c => c.id));
        const newCommunities = data.communities.filter(c => !existingIds.has(c.id));
  
        setTribe({
          ...tribe,
          communities: [...tribe.communities, ...newCommunities],
        });
      }
  
      setHasMore(data.communities.length > 0); 
      setPage(prev => prev + 1);
    } catch (err) {
      console.error("Failed to fetch tribe:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTribe();
  }, []);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 200 >=
        document.documentElement.scrollHeight
      ) {
        if (!loading && hasMore) loadTribe();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore]);

  const handleJoinToggle = async (communityId: string, joined: boolean) => {
    try {
      if (joined) {
        await leaveCommunity(communityId);
      } else {
        await joinCommunity(communityId);
      }
      setTribe(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          communities: prev.communities.map(c =>
            c.id === communityId ? { ...c, joined: !joined, members_count: joined ? c.members_count - 1 : c.members_count + 1} : c
          ),
        };
      });
    } catch (err) {
      console.error("Failed to toggle join:", err);
    }
  };

  if (!tribe) return <Skeleton  />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <header className="mb-6 border-indigo-600 dark:border-white border p-4 rounded-xl">
        <h1 className="text-3xl text-gray-700 dark:text-white font-bold">{tribe.name}</h1>
        <p className="text-gray-600 dark:text-gray-400">{tribe.description}</p>
      
        <div className="flex items-center gap-4 mt-2">

          <Link
            href={`/main/create-community?tribe=${tribe.id}`}
            className="px-3 py-1 bg-green-500 text-white rounded-full text-sm"
          >
            + Create Community
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tribe.communities.map((community) => (
          <div
            key={community.id}
            className="border border-indigo-600 dark:border-white rounded-lg overflow-hidden hover:shadow-md transition"
          >
            {/* 🔥 COVER IMAGE */}
            <img
              src={community.cover_image || "/default-cover.jpg"}
              alt={community.name}
              className="w-full h-32 object-cover"
            />
        
            {/* 🔥 CONTENT */}
            <div className="p-4">
              <div className="flex justify-between items-center">
                <Link
                  href={`/main/community/${community.id}`}
                  className="font-semibold text-gray-700 dark:text-white text-lg"
                >
                  {community.name}
                </Link>
        
                <span className="text-xs opacity-60 flex items-center text-gray-700 dark:text-white gap-1">
                  <Users size={14} />
                  {community.membersCount ?? 0}
                </span>
              </div>
        
              {/* 🔥 BUTTON */}
              <button
                onClick={() => handleJoinToggle(community.id, community.joined)}
                className={`mt-3 px-3 py-1 rounded-full text-gray-600 dark:text-gray-300 text-xs font-medium ${
                  community.joined
                    ? "bg-green-300 dark:bg-green-700"
                    : "bg-blue-100 dark:bg-blue-700"
                }`}
              >
                {community.joined ? "Joined" : "Join"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="mt-4 text-center"><LoadingSpinner /></div>}
      {!hasMore && <p className="mt-4 text-center text-gray-500">No more communities</p>}
    </div>
  );
}