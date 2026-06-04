'use client'

import {
  useEffect,
  useContext,
  useState,
  useMemo
} from 'react'

import { useNavigation } from "@/utils/useNavigation"

import { UserContext } from '@/components/UserContext'

import {
  connectUser,
  starCreator
} from '@/lib/api'

import { apiRequest } from '@/utils/api'
import { useOnboardingGuard } from '@/utils/useOnboardingGuard'

type Person = {
  id: number
  username: string
  avatar?: string
  bio?: string

  starred?: boolean

  connected?: boolean
  requestPending?: boolean
  requestReceived?: boolean

  distance?: number | null

  type?: string

  mutual_interests?: string[]
}

export default function DiscoverPeoplePage() {

  const { user, loadingUser } =
    useContext(UserContext)!

  const { push, replace } = useNavigation()

  const [people, setPeople] =
    useState<Person[]>([])

  const [loading, setLoading] =
    useState(false)

  const [expandedId, setExpandedId] =
    useState<number | null>(null)

  useOnboardingGuard('star')

  // =========================
  // CONTINUE LOGIC
  // =========================
  const canContinue = useMemo(() => {
    return people.some(
      p =>
        p.starred ||
        p.connected ||
        p.requestPending
    )
  }, [people])

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {

    if (!user && !loadingUser) {
      replace('/auth/login')
      return
    }

    if (user) {
      loadPeople()
    }

  }, [user, loadingUser])

  // =========================
  // LOAD PEOPLE
  // =========================
  const loadPeople = async () => {

    try {

      setLoading(true)

      const data = await apiRequest(
        'api/users/discover-people/'
      )

      setPeople(data)

    } catch (err) {

      console.error(err)

    } finally {

      setLoading(false)

    }
  }

  // =========================
  // STAR USER
  // =========================
  const handleStar = async (id: number) => {

    try {

      const res = await starCreator(id)

      setPeople(prev =>
        prev.map(person =>
          person.id === id
            ? {
                ...person,
                starred: res.starred
              }
            : person
        )
      )

    } catch (err: any) {

      console.error(err)

      alert(
        err.message ||
        'Failed to star user'
      )
    }
  }

  // =========================
  // CONNECT USER
  // =========================
  const handleConnect = async (
    id: number
  ) => {

    try {

      await connectUser(id)

      setPeople(prev =>
        prev.map(person =>
          person.id === id
            ? {
                ...person,
                requestPending: true
              }
            : person
        )
      )

    } catch (err) {

      console.error(err)

      alert('Failed to connect')
    }
  }

  // =========================
  // FINISH ONBOARDING
  // =========================
  const finishOnboarding = async () => {

    try {

      await apiRequest(
        'api/users/complete-onboarding/',
        {
          method: 'POST'
        }
      )

      push('/main/home')

    } catch (err: any) {

      console.error(err)
    }
  }

  // =========================
  // TOGGLE BIO
  // =========================
  const toggleExpand = (id: number) => {

    setExpandedId(prev =>
      prev === id ? null : id
    )
  }

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6">

      {/* HEADER */}
      <div className="max-w-2xl mx-auto mb-6">

        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Discover People
        </h1>

        <p className="text-center text-sm text-gray-500 mt-2">
          Follow creators and connect with people around you
        </p>

      </div>

      {/* CONTENT */}
      <div className="max-w-2xl mx-auto space-y-4">

        {loading && (
          <p className="text-center text-gray-500">
            Loading people...
          </p>
        )}

        {!loading && people.length === 0 && (
          <p className="text-center text-gray-500">
            No people found
          </p>
        )}

        {people.map(person => {

          const expanded =
            expandedId === person.id

          return (

            <div
              key={person.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm"
            >

              {/* TOP */}
              <div className="flex items-start justify-between gap-4">

                {/* LEFT */}
                <div className="flex gap-3 min-w-0">

                  {/* AVATAR */}
                  {person.avatar ? (

                    <img
                      src={person.avatar}
                      alt={person.username}
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />

                  ) : (

                    <div className="w-14 h-14 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {person.username
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                  )}

                  {/* USER INFO */}
                  <div className="min-w-0">

                    <h2 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                      {person.username}
                    </h2>

                    {person.distance !== null &&
                     person.distance !== undefined && (
                      <p className="text-xs text-gray-500">
                        {person.distance} km away
                      </p>
                    )}

                    {person.mutual_interests &&
                     person.mutual_interests.length > 0 && (
                      <p className="text-xs text-indigo-500 mt-1">
                        {person.mutual_interests
                          .slice(0, 2)
                          .join(', ')}
                      </p>
                    )}

                  </div>

                </div>

                {/* BUTTONS */}
                <div className="flex flex-col gap-2 flex-shrink-0">

                  {/* STAR */}
                  <button
                    disabled={person.starred}
                    onClick={() =>
                      handleStar(person.id)
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap
                    ${
                      person.starred
                        ? 'bg-yellow-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >

                    {person.starred
                      ? '⭐ Starred'
                      : 'Star'}

                  </button>

                  {/* CONNECT */}
                  <button
                    disabled={
                      person.connected ||
                      person.requestPending
                    }
                    onClick={() =>
                      handleConnect(person.id)
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap
                    ${
                      person.connected
                        ? 'bg-green-600 text-white'
                        : person.requestPending
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-900 hover:bg-black text-white'
                    }`}
                  >

                    {person.connected
                      ? 'Connected'
                      : person.requestPending
                      ? 'Request Sent'
                      : 'Connect'}

                  </button>

                </div>

              </div>

              {/* BIO */}
              <p
                onClick={() =>
                  toggleExpand(person.id)
                }
                className={`mt-4 text-sm text-gray-600 dark:text-gray-300 cursor-pointer
                ${
                  expanded
                    ? ''
                    : 'line-clamp-2'
                }`}
              >

                {person.bio ||
                  'No bio available'}

              </p>

            </div>
          )
        })}

        {/* CONTINUE */}
        <button
          disabled={!canContinue}
          onClick={finishOnboarding}
          className={`w-full mt-6 py-3 rounded-2xl font-semibold transition
          ${
            canContinue
              ? 'bg-black hover:bg-gray-900 text-white'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          Continue
        </button>

        {/* SKIP */}
        <button
          onClick={finishOnboarding}
          className="w-full py-2 text-sm text-gray-500 underline"
        >
          Skip for now
        </button>

      </div>

    </div>
  )
}