'use client'

import { useContext, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserContext } from '@/components/UserContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const ctx = useContext(UserContext)
  const router = useRouter()

  if (!ctx) return null

  const { user, loadingUser } = ctx

  useEffect(() => {
    if (loadingUser) return

    if (!user) {
      router.replace('/auth/login')
    }
  }, [user, loadingUser, router])

  // ⛔ Prevent login flash
  if (loadingUser) return null

  if (!user) return null

  return <>{children}</>
}