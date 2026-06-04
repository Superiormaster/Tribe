'use client'

import { useContext, useEffect } from 'react'
import { useNavigation } from "@/utils/useNavigation"
import { UserContext } from '@/components/UserContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const ctx = useContext(UserContext)
  const { replace } = useNavigation()

  if (!ctx) return null

  const { user, loadingUser } = ctx

  useEffect(() => {
    if (loadingUser) return

    if (!user) {
      replace('/auth/login')
    }
  }, [user, loadingUser, replace])

  // ⛔ Prevent login flash
  if (loadingUser) return null

  if (!user) return null

  return <>{children}</>
}