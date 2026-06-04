'use client'

import { useState, useEffect } from "react"
import { useNavigation } from "@/utils/useNavigation"
import { apiRequest } from "@/utils/api"
import { useOnboardingGuard } from "@/utils/useOnboardingGuard"

const interestsList = [
  'Politics',
  'Sports',
  'Technology',
  'Business',
  'Entertainment',
  'World News',
  'Local News'
]

interface OnboardingStatus {
  profileCompleted: boolean
  interestsCompleted: boolean
  starCompleted: boolean
  completed: boolean // all done
}

export default function Interests() {
  const { push } = useNavigation()
  const [interests, setInterests] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null); //
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await apiRequest('api/users/me/')

        setInterests(profile.interests || [])
      } catch {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  useOnboardingGuard('interests')

  const toggle = (item: string) => {
    if (interests.includes(item)) {
      setInterests(interests.filter(i => i !== item))
    } else {
      setInterests([...interests, item])
    }
  }

  const save = async () => {
    if (interests.length === 0) return alert('Please select at least one interest')
    setLoading(true)

    try {
      await apiRequest('api/users/save-interests/', {
        method: 'PATCH',
        data: { interests },
      })
      push('/auth/star')
    } catch (err: any) {
      alert(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center rounded-2xl justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-4">
          Select Your Interests
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
          Choose topics you are interested in to personalize your experience
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {interestsList.map(item => (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`px-4 py-2 rounded-lg border font-medium transition
                ${interests.includes(item) 
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-indigo-100 dark:hover:bg-indigo-600 hover:text-indigo-700'
                }`}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          onClick={save}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-white transition
            ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
          `}
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}