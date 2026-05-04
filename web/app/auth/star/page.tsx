'use client'

import { useEffect, useContext, useState, useMemo } from 'react'
import { getFriends, connectUser, starCreator } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { UserContext } from '@/components/UserContext'
import { apiRequest } from '@/utils/api'

type Creator = {
  id: number
  username: string
  avatar?: string
  bio?: string
  starred?: boolean
}

interface OnboardingStatus {
  profileCompleted: boolean
  interestsCompleted: boolean
  starCompleted: boolean
  completed: boolean // all done
}

export default function StarCreators() {
  const { user, loadingUser } = useContext(UserContext)!
  const [creators, setCreators] = useState<Creator[]>([])
  const [nearby, setNearby] = useState<NearbyUser[]>([])
  const [loading, setLoading] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const router = useRouter()

  // Compute canContinue dynamically
  const canContinue = useMemo(() => creators.some(c => c.starred), [creators])

  useEffect(() => {
    if (!user && !loadingUser) {
      router.replace('/auth/login')
      return
    }
    if (user) {
      checkOnboarding()
    }
  }, [user, loadingUser])
  
  const checkOnboarding = async () => {
    setLoading(true);
    try {
      const status: OnboardingStatus = await apiRequest('api/users/onboarding-status/')
      
      if (status.completed) {
        router.replace('/main/home')
        return
      }
  
      if (!status.profileCompleted) {
        router.replace('/auth/profile-setup')
        return
      }
  
      if (!status.interestsCompleted) {
        router.replace('/auth/interests')
        return
      }
  
      if (!status.starCompleted) {
        // load creators only if user reaches Star step
        await Promise.all([loadCreators(), loadNearby()])
      }
    } catch (err) {
      console.error("Error checking onboarding status:", err?.message || err)
    } finally {
      setLoading(false)
    }
  }
  
  const finishOnboarding = async () => {
    setLoading(true);
    try {
      await apiRequest("api/users/complete-onboarding/", {
        method: "POST",
      })
  
      setOnboardingComplete(true);
      router.push("/main/home")
    } catch (err) {
      console.error("Error finishing onboarding:", err?.message || err);
    }
  }

  const loadCreators = async () => {
    try {
      setLoading(true)
      const data = await getFriends()
      setCreators(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  const loadNearby = async () => {
    try {
      setLoading(true)
      const data = await apiRequest("api/users/discover-connect/")
      setNearby(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleConnect = async (id: number) => {
    try {
      const res = await connectUser(id)
      setNearby(prev => prev.map(n => n.id === id ? { ...n, connected: true } : n))
    } catch (err) {
      console.error(err)
      alert('Failed to connect')
    }
  }

  const star = async (id: number) => {
    try {
      const res = await starCreator(id)
      
      setCreators(prev =>
        prev.map(c =>
          c.id === id ? { ...c, starred: res.starred_user } : c
        )
      )
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to star creator')
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100 text-center">
        ⭐ Follow Creators
      </h1>

      <div className="w-full max-w-xl">
        {loading && <p className="text-center text-gray-500">Loading creators...</p>}

        {!loading && creators.length === 0 && (
          <p className="text-center text-gray-500">No creators found.</p>
        )}

        {creators.map(c => {
          const isExpanded = expandedId === c.id
          return (
            <div
              key={c.id}
              className="flex flex-col p-4 border rounded-xl mb-3 bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt={c.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                      {c.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{c.username}</p>
                  </div>
                </div>

                <button
                  disabled={c.starred}
                  onClick={e => {
                    e.stopPropagation()
                    star(c.id)
                  }}
                  className={`px-4 py-1 rounded-lg font-medium transition ${
                    c.starred
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {c.starred ? '⭐ Starred' : 'Star'}
                </button>
              </div>

              <p
                className={`text-sm text-gray-500 dark:text-gray-300 cursor-pointer ${
                  isExpanded ? '' : 'line-clamp-1'
                }`}
                onClick={() => toggleExpand(c.id)}
              >
                {c.bio || 'No bio available'}
              </p>
            </div>
          )
        })}
        
        <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-gray-100 text-center">
          🤝 Connect Nearby
        </h1>
        {nearby.length === 0 && !loading && <p className="text-center text-gray-500">No nearby users found.</p>}
        {nearby.map(n => (
          <div key={n.id} className="flex flex-col p-4 border rounded-xl mb-3 bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {n.avatar ? <img src={n.avatar} alt={n.username} className="w-12 h-12 rounded-full object-cover" />
                  : <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">{n.username.slice(0, 2).toUpperCase()}</div>}
                <div><p className="font-semibold text-gray-900 dark:text-gray-100">{n.username}</p></div>
              </div>
              <button
                disabled={n.connected}
                onClick={() => handleConnect(n.id)}
                className={`px-4 py-1 rounded-lg font-medium transition ${n.connected ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                {n.connected ? 'Connected' : 'Connect'}
              </button>
            </div>
            <p className={`text-sm text-gray-500 dark:text-gray-300 cursor-pointer ${expandedId === n.id ? '' : 'line-clamp-1'}`}
              onClick={() => toggleExpand(n.id)}>
              {n.bio || 'No bio available'}
            </p>
          </div>
        ))}

        <button
          disabled={!canContinue}
          onClick={finishOnboarding}
          className={`mt-6 w-full py-3 rounded-xl font-semibold transition
            ${canContinue ? 'bg-black hover:bg-gray-900 text-white' : 'bg-gray-400 cursor-not-allowed text-gray-200'}
          `}
        >
          Continue
        </button>
        <button
          onClick={finishOnboarding}
          className="mt-3 w-full py-2 text-gray-500 underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}