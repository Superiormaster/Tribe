'use client'

import { useEffect } from 'react'
import NProgress from 'nprogress'

export default function NProgressInit() {
  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 120,
      minimum: 0.08,
    })
  }, [])

  return null
}