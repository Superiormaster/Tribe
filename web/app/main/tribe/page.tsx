'use client'

import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/utils/api'
import { useNavigation } from '@/utils/useNavigation'
import Skeleton from '@/components/Skeleton'
import { ChevronRight } from 'lucide-react'

interface Community {
  id: number;
  name: string;
  members: number;
  cover_image?: string;
}

interface Tribe {
  id: number;
  name: string;
  community_count: number;

  communities?: Community[];
  expanded?: boolean;
  loading?: boolean;
  communityPage?: number;
  hasMoreCommunities?: boolean;
}

export default function DiscoverPage() {
  const { push } = useNavigation()

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const initialized = useRef(false);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  async function loadTribes(pageNumber = pageRef.current) {
    if (
        pageNumber !== 1 &&
        (loadingRef.current || loading || !hasMore)
    ) {
        return;
    }
  
    setLoading(true);
    if (pageNumber === 1) {
      setInitialLoading(true);
    }
    loadingRef.current = true;
  
    try {
      const data = await apiRequest(
        `api/users/discover-communities/?page=${pageNumber}`
      );
  
      const newTribes = data.results.map((t: Tribe) => ({
        ...t,
        communities: [],
        expanded: false,
        loading: false,
        communityPage: 1,
        hasMoreCommunities: true,
      }));
  
      setTribes(prev => {
        const existing = new Set(prev.map(t => t.id));
      
        return [
          ...prev,
          ...newTribes.filter((t: any) => !existing.has(t.id)),
        ];
      });
  
      pageRef.current++;
      setHasMore(data.next !== null);
    } finally {
      setLoading(false);
      if (pageNumber === 1) {
        setInitialLoading(false);
      }
      loadingRef.current = false;
    }
  }
  
  useEffect(() => {
    if (initialized.current) return;
  
    initialized.current = true;
    loadTribes(1);
  }, []);
  
  async function toggleTribe(tribeId: number) {
    const tribe = tribes.find(t => t.id === tribeId);
  
    if (!tribe) return;
  
    if (tribe.expanded) {
      setTribes(prev =>
        prev.map((t: any) => ({
          ...t,
          expanded: t.id === tribeId,
          loading: t.id === tribeId,
        }))
      );
  
      return;
    }
  
    if (tribe.communities!.length === 0) {
      setTribes(prev =>
        prev.map((t: any) => ({
          ...t,
          expanded: t.id === tribeId,
          loading: t.id === tribeId,
        }))
      );
  
      try {
        const data = await apiRequest(
          `api/users/tribes/${tribeId}/communities/?page=1`
        );
      
        setTribes(prev =>
          prev.map((t: any) =>
            t.id === tribeId
              ? {
                  ...t,
                  expanded: true,
                  loading: false,
                  communities: data.results,
                  communityPage: 2,
                  hasMoreCommunities: data.next !== null,
                }
              : t
          )
        );
      } catch (err) {
        console.error(err);
      
        setTribes(prev =>
          prev.map((t: any) =>
            t.id === tribeId
              ? {
                  ...t,
                  loading: false,
                  expanded: false,
                }
              : t
          )
        );
      }
    } else {
      setTribes(prev =>
        prev.map((t: any) => ({
          ...t,
          expanded: t.id === tribeId,
        }))
      );
    }
  }
  
  async function loadMoreCommunities(tribeId: number) {
    if (loadingRef.current) return;

    try {
      const tribe = tribes.find(t => t.id === tribeId);
    
      if (
        !tribe ||
        tribe.loading ||
        !tribe.hasMoreCommunities
      ) {
        return;
      }
  
      loadingRef.current = true;
    
      setTribes(prev =>
        prev.map((t: any) =>
          t.id === tribeId
            ? { ...t, loading: true }
            : t
        )
      );
    
      const data = await apiRequest(
        `api/users/tribes/${tribeId}/communities/?page=${tribe.communityPage}`
      );
    
      setTribes(prev =>
        prev.map(t =>
          t.id === tribeId
            ? {
                ...t,
                loading: false,
                communities: [
                  ...t.communities!,
                  ...data.results,
                ],
                communityPage: t.communityPage! + 1,
                hasMoreCommunities:
                  data.next !== null,
              }
            : t
        )
      );
    } finally {
      loadingRef.current = false;
    }
  }
  
  useEffect(() => {
    function handleScroll() {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 300
      ) {
        loadTribes();
      }
    }
  
    window.addEventListener("scroll", handleScroll);
  
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, [hasMore]);

  if (initialLoading) {
    return (
      <div className="mt-20">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    )
  }

  return (
    <div className="my-20 max-w-6xl mx-auto text-gray-700 dark:text-gray-200 px-4">

      <h1 className="text-3xl font-bold mb-2">
        Discover
      </h1>

      <p className="text-gray-500 mb-8">
        Browse tribes and communities.
      </p>

      <div className="space-y-10">

        {tribes.map((tribe) => (

          <section
            key={tribe.id}
            className="rounded-3xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-6"
          >

            <div className="flex items-center justify-between mb-6">

              <button
                onClick={() =>
                  push(`/main/tribe/${tribe.id}`)
                }
                className="text-left"
              >
                <h2 className="text-2xl font-bold">
                  {tribe.name}
                </h2>
            
                <p className="text-sm text-gray-500">
                  {tribe.community_count} communities
                </p>
              </button>
            
              <button
                onClick={() => toggleTribe(tribe.id)}
              >
                <ChevronRight
                  className={`transition ${
                    tribe.expanded ? "rotate-90" : ""
                  }`}
                />
              </button>
            
            </div>
  
            {tribe.expanded && (

              <div
                className="max-h-96 overflow-y-auto space-y-3"
                onScroll={(e) => {
                  const el = e.currentTarget;
            
                  if (
                    el.scrollTop + el.clientHeight >=
                    el.scrollHeight - 100
                  ) {
                    loadMoreCommunities(tribe.id);
                  }
                }}
              >
            
                {tribe.communities?.map(community => (
            
                  <button
                    key={community.id}
                    onClick={() =>
                      push(`/main/community/${community.id}`)
                    }
                    className="w-full border text-left px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition font-medium"
                  >
                    {community.name}
                  </button>
            
                ))}
            
              </div>
            
            )}

          </section>

        ))}

      </div>
      
      {loading && !initialLoading && (
        <p className="text-center py-6 text-gray-500">
          Loading...
        </p>
      )}

    </div>
  )
}