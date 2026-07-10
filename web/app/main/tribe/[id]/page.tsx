'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppLink from '@/components/AppLink';
import { Users } from "lucide-react";

import {
  fetchTribeData,
  joinCommunity,
} from "@/lib/API_dev";

import Skeleton from "@/components/Skeleton";

interface Community {
  id: string;
  name: string;
  membersCount: number;
  cover_image: string;
  joined: boolean;
  requested?: boolean;
  invited?: boolean;
  join_approval_required?: boolean;
}

interface Tribe {
  id: string;
  name: string;
  description: string;
  communities: Community[];
}

export default function TribePage() {

  const { id } = useParams();

  const [tribe, setTribe] =
    useState<Tribe | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [page, setPage] =
    useState(1);

  const [hasMore, setHasMore] =
    useState(true);

  // LOAD TRIBE
  const loadTribe = async () => {

    if (!hasMore) return;

    setLoading(true);

    try {

      const data = await fetchTribeData(
        id,
        page
      );

      console.log(
        "COMMUNITIES FROM API",
        data.communities
      );
      console.log(
        data.communities.find(
          (c: Community) => c.id === 7
        )
      );

      if (!tribe) {

        setTribe(data);

      } else {

        const existingIds = new Set(
          tribe.communities.map(
            c => c.id
          )
        );

        const newCommunities =
          data.communities.filter(
            (c: Community) =>
              !existingIds.has(c.id)
          );

        setTribe({
          ...tribe,
          communities: [
            ...tribe.communities,
            ...newCommunities,
          ],
        });
      }

      setHasMore(
        data.communities.length > 0
      );

      setPage(prev => prev + 1);

    } catch (err) {

      console.error(
        "Failed to fetch tribe:",
        err
      );

    } finally {

      setLoading(false);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    loadTribe();
  }, []);

  // INFINITE SCROLL
  useEffect(() => {

    const handleScroll = () => {

      if (
        window.innerHeight +
          document.documentElement
            .scrollTop +
          200 >=
        document.documentElement
          .scrollHeight
      ) {

        if (!loading && hasMore) {
          loadTribe();
        }
      }
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );

  }, [loading, hasMore]);

  // JOIN / REQUEST
  const handleJoinToggle = async (communityId: string) => {
    try {
      const response = await joinCommunity(communityId);
  
      console.log("TRIBE JOIN RESPONSE", response);
  
      setTribe(prev => {
        if (!prev) return prev;
  
        return {
          ...prev,
          communities: prev.communities.map(c => {
            if (c.id !== communityId) return c;
  
            switch (response.status) {
  
              case "joined":
              case "already_joined":
                return {
                  ...c,
                  joined: true,
                  requested: false,
                  invited: false,
                  membersCount: c.membersCount + 1,
                };
  
              case "requested":
              case "already_requested":
                return {
                  ...c,
                  joined: false,
                  requested: true,
                  invited: false,
                };
  
              case "invited":
                return {
                  ...c,
                  joined: false,
                  requested: false,
                  invited: true,
                };
  
              default:
                return c;
            }
          }),
        };
      });
  
    } catch (err) {
      console.error("Failed to join:", err);
    }
  };

  if (!tribe) {
    return <Skeleton />;
  }

  return (
    <div className="max-w-4xl mt-20 mb-12 mx-auto px-4 py-6">

      {/* HEADER */}
      <header className="mb-6 border border-indigo-600 dark:border-white p-4 rounded-xl">

        <h1 className="text-3xl font-bold text-gray-700 dark:text-white">
          {tribe.name}
        </h1>

        <p className="text-gray-600 dark:text-gray-400">
          {tribe.description}
        </p>

        <div className="flex items-center gap-4 mt-3">

          <AppLink
            href={`/main/create-community?tribe=${tribe.id}`}
            prefetch={false}
            className="px-3 py-1 bg-green-500 text-white rounded-full text-sm"
          >
            + Create Community
          </AppLink>

        </div>
      </header>

      {/* COMMUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {tribe.communities.map(
          (community) => (

          <div
            key={community.id}
            className="border border-indigo-600 dark:border-white rounded-xl overflow-hidden hover:shadow-md transition"
          >

            {/* COVER */}
            <img
              src={
                community.cover_image ||
                "/default-cover.jpg"
              }
              alt={community.name}
              className="w-full h-32 object-cover"
            />

            {/* CONTENT */}
            <div className="p-4">

              <div className="flex items-center justify-between">

                <AppLink
                  href={`/main/community/${community.id}`}
                  prefetch={false}
                  className="font-semibold text-lg text-gray-700 dark:text-white"
                >
                  {community.name}
                </AppLink>

                <span className="text-xs opacity-60 flex items-center gap-1 text-gray-700 dark:text-white">

                  <Users size={14} />

                  {community.membersCount ?? 0}

                </span>
              </div>

              {/* JOIN BUTTON */}
              <button
                onClick={() =>
                  handleJoinToggle(
                    community.id
                  )
                }
                disabled={
                  community.joined ||
                  community.requested ||
                  community.invited
                }
                className={`mt-3 px-3 py-1 rounded-full text-xs font-medium transition ${
                  community.joined
                    ? "bg-green-300 dark:bg-green-700 text-black dark:text-white"

                    : community.requested
                    ? "bg-yellow-300 dark:bg-yellow-700 text-black dark:text-white"

                    : "bg-blue-100 dark:bg-blue-700 text-black dark:text-white"
                }`}
              >
                {community.joined
                  ? "Joined"
                  : community.requested
                  ? "Requested"
                  : community.invited
                  ? "Already Invited"
                  : community.join_approval_required
                  ? "Request to Join"
                  : "Join"}

              </button>

            </div>

          </div>
        ))}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="mt-4 text-center">
          <Skeleton />
        </div>
      )}

      {/* END */}
      {!hasMore && (
        <p className="mt-4 text-center text-gray-500">
          No more communities
        </p>
      )}

    </div>
  );
}