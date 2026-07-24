'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function BottomNavWrapper() {
  const pathname = usePathname()

  const hideBottomNav =
    /^\/main\/home\/\d+/.test(pathname) ||
    /^\/main\/reposts\/\d+/.test(pathname) ||
    /^\/main\/messages\/chat\/\d+/.test(pathname) ||
    /^\/main\/reels\/\d+/.test(pathname) ||
    /^\/main\/community\/\d+\/chat/.test(pathname)

  if (hideBottomNav) return null

  return <BottomNav />
}