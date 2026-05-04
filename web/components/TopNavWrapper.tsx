'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function TopNavWrapper() {
  const pathname = usePathname()

  const hideNavbar = /^\/main\/messages\/chat\/\d+/.test(pathname)

  if (hideNavbar) return null

  return <Navbar />
}