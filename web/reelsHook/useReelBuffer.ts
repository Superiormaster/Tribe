'use client';

import { useMemo, useState } from 'react';
import { useNetwork } from '@/components/networkConnection/NetworkContext';

export function useReelBuffer() {
  const [buffering, setBuffering] = useState(false);

  const {
    canCommunicate,
    serverReachable,
    reconnecting,
    networkStatus,
    isOnline,
  } = useNetwork();

  const showSpinner = useMemo(() => {
    return (
      buffering ||
      !canCommunicate ||
      !serverReachable ||
      reconnecting
    );
  }, [
    buffering,
    canCommunicate,
    serverReachable,
    reconnecting,
  ]);

  return {
    buffering,
    setBuffering,

    showSpinner,

    canCommunicate,
    serverReachable,
    reconnecting,
    networkStatus,
    isOnline,
  };
}