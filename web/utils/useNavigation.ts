'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import NProgress from 'nprogress'

export function useNavigation() {
  const router = useRouter()

  const push = useCallback((url: string) => {
    NProgress.start()
    router.push(url)
  }, [router])

  const replace = useCallback((url: string) => {
    NProgress.start()
    router.replace(url)
  }, [router])

  const back = useCallback(() => {
    NProgress.start()
    router.back()
  }, [router])

  return {
    push,
    replace,
    back,
  }
}