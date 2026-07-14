"use client";

import AppLink from '@/components/AppLink';
import SearchSkeleton from "./SearchSkeleton";
import { useState, useRef, useEffect } from 'react' 
import { useInView } from '@/components/UseInView'
import ReelCard from '@/components/ReelCard'

type Props = {
  query: string;
  results: any;
  loading: boolean;
  activeTab: string;
  setActiveTab: (v: string) => void;
};

export default function SearchResults({
  query,
  results,
  loading,
  activeTab,
  setActiveTab,
}: Props) {

  if (!query) return null;

  if (loading) {
    return <SearchSkeleton />;
  }
  
  const visibleUsers =
    (results.users || []).slice(
      activeTab === "all" ? 0 : undefined,
      activeTab === "all" ? 5 : undefined
    );
  
  const visiblePosts =
    (results.posts || []).slice(
      activeTab === "all" ? 0 : undefined,
      activeTab === "all" ? 5 : undefined
    );
  
  const visibleCommunities =
    (results.communities || []).slice(
      activeTab === "all" ? 0 : undefined,
      activeTab === "all" ? 5 : undefined
    );

  const visibleTribes =
    (results.tribes || []).slice(
      activeTab === "all" ? 0 : undefined,
      activeTab === "all" ? 5 : undefined
    );

  const noResults =
    results.users?.length === 0 &&
    results.tribes?.length === 0 &&
    results.communities?.length === 0 &&
    results.posts?.length === 0;

  if (noResults) {
    return (
      <p className="text-gray-500 text-sm">
        No results found for "{query}"
      </p>
    );
  }

  return (
    <div className="space-y-6 mx-2">

      {(activeTab === "all" ||
        activeTab === "people") &&
        results.users?.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
              👤 Users
            </h2>

            {visibleUsers.map((u: any) => (
              <AppLink
                className="p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                key={u.id}
                href={`/main/profile/${u.username}`}
                prefetch={false}
              >
                {u.avatar ? (  
                  <img  
                    src={u.avatar}  
                    alt={u.username}  
                    className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover cursor-pointer"  
                  />  
                ) : (  
                  <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold cursor-pointer">  
                    {u.username.slice(0,2).toUpperCase()}  
                  </div>  
                )}  
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {u.username}
                </div>
              </AppLink>
            ))}

            {activeTab === "all" && results.users?.length > 5 && (
              <button
                onClick={() => setActiveTab("people")}
                className="text-xs text-indigo-500"
              >
                See all
              </button>
            )}
          </div>
      )}

      {(activeTab === "all" ||
        activeTab === "communities") && (
          <>
            {results.communities?.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                  💬 Communities
                </h2>

                {visibleCommunities.map((c: any) => (
                  <AppLink
                    className="p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                    key={c.id}
                    prefetch={false}
                    href={`/main/community/${c.id}`}
                  >
                    {c.cover_image ? (  
                      <img  
                        src={c.cover_image}  
                        alt={c.name}  
                        className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover cursor-pointer"  
                      />  
                    ) : (  
                      <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold cursor-pointer">  
                        {c.name.slice(0,2).toUpperCase()}  
                      </div>  
                    )}  
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {c.name}
                    </div>
                  </AppLink>
                ))}

                {activeTab === "all" && results.communities?.length > 5 && (
                  <button
                    onClick={() => setActiveTab("communities")}
                    className="text-xs text-indigo-500"
                  >
                    See all
                  </button>
                )}
              </div>
            )}
          </>
      )}

      {(activeTab === "all" ||
        activeTab === "tribes") &&  results.tribes?.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
              🎯 Explore Tribes
            </h2>

            {visibleTribes.map((t: any) => (
              <AppLink
                className="p-3 border rounded-lg flex items-center border-gray-200 dark:border-gray-700 gap-3 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
                key={t.id}
                href={`/main/tribe/${t.id}`}
                prefetch={false}
              >
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {t.name}
                </div>
              </AppLink>
            ))}

            {activeTab === "all" && results.tribes?.length > 5 && (
              <button
                onClick={() => setActiveTab("tribes")}
                className="text-sm text-indigo-500"
              >
                See all
              </button>
            )}
          </div>
      )}

      {/* POSTS */}
      {(activeTab === "all" || activeTab === "posts") &&
        results.posts?.length > 0 && (
          <div className="space-y-4">
      
            <h2 className="text-sm text-gray-700 dark:text-gray-200 font-bold">
              📝 Posts
            </h2>
      
            {visiblePosts.map((p: any) => (
              <div
                key={p.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900"
              >
      
                {/* REELS */}
                {p.content_type === "short_video" ? (
      
                  <ReelCard post={p} />
      
                ) : (
      
                  <AppLink
                    prefetch={false}
                    href={
                      p.feed_type === "repost"
                        ? `/main/reposts/${p.id}`
                        : `/main/home/${p.id}`
                    }
                  >
      
                    <div className="space-y-3 p-3">
      
                      {p.feed_type === "repost" && (
                        <div className="text-xs text-green-500 font-medium">
                          🔁 Repost
                        </div>
                      )}
                      {/* CAPTION */}
                      {p.caption && (
                        <p className="text-sm line-clamp-1 text-gray-700 dark:text-gray-300">
                          {p.caption}
                        </p>
                      )}
      
                      {/* MEDIA */}
                      {p.media?.length > 0 && (
                        <div
                          className={`grid gap-2 ${
                            p.media.length === 1
                              ? "grid-cols-1"
                              : p.media.length === 2
                              ? "grid-cols-2"
                              : "grid-cols-2 md:grid-cols-3"
                          }`}
                        >
      
                          {p.media.map((m: any, i: number) => (
      
                            <MediaItem
                              key={i}
                              media={m}
                            />
      
                          ))}
      
                        </div>
                      )}
      
                    </div>
      
                  </AppLink>
      
                )}
      
              </div>
            ))}

            {activeTab === "all" && results.posts?.length > 5 && (
              <button
                onClick={() => setActiveTab("posts")}
                className="text-sm text-indigo-500"
              >
                See all
              </button>
            )}
      
          </div>
      )}

    </div>
  );
}

const MediaItem = ({ media }: any) => {

  // IMAGE
  if (media.type === "image") {
    return (
      <img
        src={media.url}
        loading="lazy"
        className="rounded-xl w-full aspect-square object-cover"
      />
    );
  }

  // VIDEO / REEL
  return (
    <video
      src={media.url}
      poster={media.thumbnail}
      preload="metadata"
      onError={() => {}}
      controls
      className="rounded-xl w-full aspect-video object-cover"
    />
  );
};