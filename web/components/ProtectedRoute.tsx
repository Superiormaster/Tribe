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
    loadingUser,
  } = useContext(UserContext)!;
  const { isOnline } = useNetwork();
  const { replace } = useNavigation();

  useEffect(() => {
    if (!authReady || loadingUser) return;
    if (!isOnline) return;

    if (authFailed) {
        replace("/auth/login");
        return;
    }

    if (!user) {
        replace("/auth/login");
    }
  }, [
    authReady,
    authFailed,
    user,
    replace,
    loadingUser,
  ]);

  if (!authReady) {
      return null;
  }

  return <>{children}</>
}