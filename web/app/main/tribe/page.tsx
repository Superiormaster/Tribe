'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/utils/api'
import { useNavigation } from '@/utils/useNavigation'
import Skeleton from '@/components/Skeleton'
import { ChevronRight } from 'lucide-react'

interface Community {
  id: number
  name: string
}

interface Tribe {
  id: number
  name: string
  communities: Community[]
}

export default function DiscoverPage() {
  const { push } = useNavigation()

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load()
  }, [])

  async function load(pageNumber = 1) {
    if (loading || !hasMore) return;
  
    setLoading(true);
  
    try {
      const data = await apiRequest(
        `api/users/discover-communities/?page=${pageNumber}`
      );
  
      setTribes(prev => [...prev, ...data.results]);
      setHasMore(data.next !== null);
      setPage(pageNumber);
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    function handleScroll() {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 300
      ) {
        load(page + 1);
      }
    }
  
    window.addEventListener("scroll", handleScroll);
  
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, [page, loading, hasMore]);
  
  useEffect(() => {
    load(1);
  }, []);

  if (loading) {
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

            <button
              onClick={() =>
                push(`/main/tribe/${tribe.id}`)
              }
              className="w-full flex items-center justify-between mb-6"
            >

              <h2 className="text-2xl font-bold">
                {tribe.name}
              </h2>

              <ChevronRight size={22} />

            </button>

            <div className="flex flex-wrap gap-3">

              {tribe.communities.map((community) => (

                <button
                  key={community.id}
                  onClick={() =>
                    push(`/main/community/${community.id}`)
                  }
                  className="
                    px-5
                    py-3
                    rounded-2xl
                    border
                    bg-gray-50
                    dark:bg-gray-800
                    hover:bg-indigo-600
                    hover:text-white
                    hover:border-indigo-600
                    transition
                    font-medium
                  "
                >
                  {community.name}
                </button>

              ))}

            </div>

          </section>

        ))}

      </div>

    </div>
  )
}