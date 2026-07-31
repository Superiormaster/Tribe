'use client'

import { useContext, useEffect } from 'react'
import { useNavigation } from "@/utils/useNavigation"
import { UserContext } from '@/components/UserContext'
import { useNetwork } from "@/components/networkConnection/NetworkContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const {
    user,
    authReady,
    authFailed,
  } = useContext(UserContext)!;
  const { isOnline } = useNetwork();
  const { replace } = useNavigation();

  useEffect(() => {
    if (!authReady) return;

    if (!isOnline) return;
    if (authFailed || !user) {
        replace("/auth/login");
    }
  }, [
    authReady,
    authFailed,
    user,
    replace,
  ]);

  if (!authReady) {
      return null;
  }

  return <>{children}</>
}