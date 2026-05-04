'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

export default function RouteLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.start()

    const timeout = setTimeout(() => {
      NProgress.done()
    }, 300)

    return () => clearTimeout(timeout)
  }, [pathname, searchParams])

  return null
}