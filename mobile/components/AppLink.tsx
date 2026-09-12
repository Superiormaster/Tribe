'use client'

import Link from 'next/link'
import NProgress from 'nprogress'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export default function AppLink({
  href,
  children,
  ...props
}: any) {
  const router = useRouter()

  const handleClick = useCallback(
    (e: any) => {
      if (
        e?.metaKey ||
        e?.ctrlKey ||
        e?.shiftKey ||
        e?.button === 1
      ) {
        return // allow new tab
      }

      NProgress.start()
    },
    []
  )

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}