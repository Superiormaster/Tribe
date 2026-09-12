'use client';

import { usePathname } from 'next/navigation';
import NetworkBanner from '@/components/networkConnection/NetworkBanner';

export default function NetworkBannerWrapper() {
  const pathname = usePathname();

  const hideNetworkBanner =
    /^\/main\/home/.test(pathname) 

  if (hideNetworkBanner) return null;

  return <NetworkBanner />;
}