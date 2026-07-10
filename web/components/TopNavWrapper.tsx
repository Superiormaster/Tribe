'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

export default function TopNavWrapper() {
  const pathname = usePathname();
  const [selectionMode, setSelectionMode] =
    useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      setSelectionMode(
        e.detail.active
      );
    };

    window.addEventListener(
      'chat-selection-change',
      handler
    );

    return () =>
      window.removeEventListener(
        'chat-selection-change',
        handler
      );
  }, []);

  const hideNavbar =
    /^\/main\/messages\/chat\/\d+/.test(pathname) ||
    /^\/main\/community\/\d+\/chat/.test(pathname) ||
    /^\/main\/reels\/\d+/.test(pathname) ||
    selectionMode;

  if (hideNavbar) return null;

  return <Navbar />;
}