'use client'

import { useEffect, useState } from 'react'
import AppLink from '@/components/AppLink';
import { apiRequest } from '@/utils/api'

type User = {
  id: number
  username: string
  avatar?: string
}

export default function MyStarsPage() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    loadStars()
  }, [])

  const loadStars = async () => {
    const data = await apiRequest(`api/users/star/my_stars/`)
    setUsers(data)
  }

  return (
    <div className="p-4 my-20 text-gray-700 dark:text-gray-200 space-y-3 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">⭐ People I Starred</h1>

      {users.map(user => (
        <AppLink
          key={user.id}
          href={`/main/profile/${user.username}`}
          className="flex items-center gap-3 p-3 border border-indigo-600 dark:border-gray-200 rounded-lg cursor-pointer"
        >
          {user.avatar ? (
            <img src={user.avatar} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white">
              {user.username.slice(0,2).toUpperCase()}
            </div>
          )}

          <p className="font-medium">{user.username}</p>
        </AppLink>
      ))}
    </div>
  )
}