'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/utils/api'
import { useNavigation } from '@/utils/useNavigation'
import { useOnboardingGuard } from '@/utils/useOnboardingGuard'

interface Community {
  id: number
  name: string
}

interface Tribe {
  id: number
  name: string
  communities: Community[]
}

export default function DiscoverCommunities() {
  const { push } = useNavigation()

  useOnboardingGuard("discover")

  const [tribes, setTribes] = useState<Tribe[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const data = await apiRequest(
        "api/users/discover-communities/"
      )

      setTribes(data.results || data)
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: number) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  async function save() {
    if (selected.length === 0) {
      alert("Select at least one community.")
      return
    }

    await apiRequest(
      "api/users/discover-join/",
      {
        method: "POST",
        data: {
          community_ids: selected
        }
      }
    )

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

      <p className="text-gray-500 mb-8">
        Pick communities that match your interests.
      </p>

      {tribes.map(tribe => (

        <div
          key={tribe.id}
          className="mb-10"
        >

          <h2 className="font-bold text-xl mb-4">
            {tribe.name}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

            {tribe.communities.map(community => {

              const active = selected.includes(
                community.id
              )

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

              )

            })}

          </div>

        </div>

      ))}

      <button
        onClick={save}
        className="w-full mt-8 bg-indigo-600 text-white py-3 rounded-xl"
      >
        Continue
      </button>

    </div>
  )
}