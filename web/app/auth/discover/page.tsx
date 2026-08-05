'use client'

import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/utils/api'
import { useNavigation } from '@/utils/useNavigation'
import { useOnboardingGuard } from '@/utils/useOnboardingGuard'
import { ChevronRight } from 'lucide-react'

interface Community {
  id: number
  name: string
}

interface Tribe {
  id: number;
  name: string;
  community_count: number;

  expanded?: boolean;
  loading?: boolean;
  communityPage?: number;
  hasMoreCommunities?: boolean;

  communities?: Community[];
}

export default function DiscoverCommunities() {
  const { push } = useNavigation()

  useOnboardingGuard("discover")

  const [tribes, setTribes] = useState<Tribe[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const initialized = useRef(false);
  const pageRef = useRef(1);
  const loadingTribesRef = useRef(false);
  const loadingCommunitiesRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    if (initialized.current) return;
  
    initialized.current = true;
    load(1);
  }, []);

  async function load(pageNumber = pageRef.current) {
    if (pageNumber !== 1 && (loadingTribesRef.current || loadingMore || !hasMore)) {
      return;
    }
  
    loadingTribesRef.current = true;
  
    try {
      pageNumber === 1
        ? setLoading(true)
        : setLoadingMore(true);
  
      const data = await apiRequest(
        `api/users/discover-communities/?page=${pageNumber}`
      );
  
      const newTribes = data.results.map((tribe: Tribe) => ({
        ...tribe,
        expanded: false,
        loading: false,
        communityPage: 1,
        hasMoreCommunities: true,
        communities: [],
      }));
  
      if (pageNumber === 1) {
        setTribes(newTribes);
  
        if (newTribes.length === 0) {
          push("/auth/star");
          return;
        }
      } else {
        setTribes(prev => {
          const existing = new Set(prev.map(t => t.id));
        
          return [
            ...prev,
            ...newTribes.filter((t: any) => !existing.has(t.id)),
          ];
        });
      }
  
      pageRef.current++;
      setHasMore(data.next !== null);
  
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingTribesRef.current = false;
    }
  }
  
  async function toggleTribe(id: number) {

    const tribe = tribes.find(t => t.id === id);
  
    if (!tribe) return;
  
    if (tribe.expanded) {
      setTribes(prev =>
        prev.map((t: any) => ({
          ...t,
          expanded: t.id === id ? !t.expanded : false,
        }))
      );
  
      return;
    }
  
    if (tribe.communities!.length > 0) {
      setTribes(prev =>
        prev.map((t: any) => ({
          ...t,
          expanded: t.id === id ? !t.expanded : false,
        }))
      );
  
      return;
    }
  
    setTribes(prev =>
      prev.map((t: any) => ({
        ...t,
        expanded: t.id === id,
        loading: t.id === id,
      }))
    );
  
    try {
      const data = await apiRequest(
        `api/users/tribes/${id}/communities/?page=1`
      );
    
      setTribes(prev =>
        prev.map((t: any) =>
          t.id === id
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
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                loading: false,
                expanded: false,
              }
            : t
        )
      );
    }
  }
  
  async function loadMoreCommunities(id: number) {
    if (loadingCommunitiesRef.current[id]) return;
  
    loadingCommunitiesRef.current[id] = true;

    try {
      const tribe = tribes.find(t => t.id === id);
    
      if (
        !tribe ||
        tribe.loading ||
        !tribe.hasMoreCommunities
      ) {
        return;
      }
    
      setTribes(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, loading: true }
            : t
        )
      );
    
      try {
        const data = await apiRequest(
          `api/users/tribes/${id}/communities/?page=${tribe.communityPage}`
        );
      
        setTribes(prev =>
          prev.map(t => {
            if (t.id !== id) return t;
        
            const existing = new Set(
              t.communities!.map(c => c.id)
            );
        
            return {
              ...t,
              loading: false,
              communities: [
                ...t.communities!,
                ...data.results.filter(
                  (c: Community) => !existing.has(c.id)
                ),
              ],
              communityPage: t.communityPage! + 1,
              hasMoreCommunities: data.next !== null,
            };
          })
        );
      } catch (err) {
        console.error(err);
      
        setTribes(prev =>
          prev.map(t =>
            t.id === id
              ? {
                  ...t,
                  loading: false,
                  expanded: false,
                }
              : t
          )
        );
      }
    } finally {
      loadingCommunitiesRef.current[id] = false;
    }
  }
  
  useEffect(() => {
    const handleScroll = () => {
      if (
        loadingTribesRef.current ||
        !hasMore
      ) return;
  
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 300
      ) {
        load();
      }
    };
  
    window.addEventListener("scroll", handleScroll);
  
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, [hasMore]);

  function toggle(id: number) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  async function save() {
    if (selected.length > 0) {
      await apiRequest(
        "api/users/discover-join/",
        {
          method: "POST",
          data: {
            community_ids: selected
          }
        }
      )
    }

    push("/auth/star")
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">

      <h1 className="text-3xl font-bold">
        Discover Communities
      </h1>

      <p className="text-gray-500">
        Pick communities that match your interests.
      </p>
      
      <p className="mt-2 mb-8 text-sm font-medium text-indigo-600">
        Select at least one community to continue.
      </p>

      {tribes.map(tribe => (

        <div
          key={tribe.id}
          className="mb-10"
        >

          <button
            onClick={() => toggleTribe(tribe.id)}
            className="w-full flex items-center justify-between mb-4"
          >
            <div>
              <h2 className="font-bold text-xl">
                {tribe.name}
              </h2>
          
              <p className="text-sm text-gray-500">
                {tribe.community_count} communities
              </p>
            </div>
          
            <ChevronRight
              className={`transition ${
                tribe.expanded ? "rotate-90" : ""
              }`}
            />
          </button>

          {tribe.expanded && (

            <div
              className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto"
              onScroll={(e) => {

                const el = e.currentTarget;
              
                if (
                  el.scrollTop + el.clientHeight >=
                    el.scrollHeight - 100 &&
                  !tribe.loading
                ) {
                  loadMoreCommunities(tribe.id);
                }
              
              }}
            >
          
              {tribe.communities?.map(community => {
          
                const active = selected.includes(
                  community.id
                );
          
                return (
          
                  <button
                    key={community.id}
                    onClick={() => toggle(community.id)}
                    className={`rounded-xl border p-4 transition ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-gray-900 hover:border-indigo-500"
                    }`}
                  >
                    {community.name}
                  </button>
          
                );
          
              })}
          
              {tribe.loading && (
                <div className="col-span-full text-center py-4">
                  Loading...
                </div>
              )}
          
            </div>
          
          )}

        </div>

      ))}

      <button
        onClick={save}
        disabled={selected.length === 0}
        className={`w-full mt-8 py-3 rounded-xl transition ${
          selected.length === 0
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        Continue
      </button>
  
      {loadingMore && (
        <div className="py-6 text-center text-gray-500">
          Loading more...
        </div>
      )}

    </div>
  )
}