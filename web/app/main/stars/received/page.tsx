'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/utils/api'

type User = {
  id: number
  username: string
  avatar?: string
}

export default function MyStarsPage() {
  const [users, setUsers] = useState<User[]>([])
  const router = useRouter()

  useEffect(() => {
    loadStars()
  }, [])

  const loadStars = async () => {
    const data = await apiRequest(`api/users/star/my_stars/`)
    setUsers(data)
  }

  return (
    <div className="p-4 space-y-3 max-w-xl mx-auto">
      <h1 className="text-xl text-gray-700 dark:text-white font-bold mb-4">⭐ Stars I received </h1>

      {users.map(user => (
        <div
          key={user.id}
          onClick={() => router.push(`/main/profile/${user.username}`)}
          className="flex items-center gap-3 p-3 border border-indigo-600 dark:border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100"
        >
          {user.avatar ? (
            <img src={user.avatar} className="w-10 h-10 rounded-full border-gray-700 dark:border-gray-200 border" />
          ) : (
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white">
              {user.username.slice(0,2).toUpperCase()}
            </div>
          )}

          <p className="text-gray-700 dark:text-white font-medium">{user.username}</p>
        </div>
      ))}
    </div>
  )
}