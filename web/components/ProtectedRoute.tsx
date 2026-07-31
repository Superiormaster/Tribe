'use client'

import { useContext, useEffect } from 'react'
import { useNavigation } from "@/utils/useNavigation"
import { UserContext } from '@/components/UserContext'
import LoadingScreen from '@/components/LoadingScreen'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const {
    user,
    loadingUser,
    authReady,
    authFailed,
  } = useContext(UserContext)!;
  const { replace } = useNavigation();

  useEffect(() => {
    if (!authReady || loadingUser) return;

    if (authFailed || !user) {
        replace("/auth/login");
    }
  }, [
    authReady,
    loadingUser,
    authFailed,
    user,
    replace,
  ]);

  if (!authReady || loadingUser) {
      return <LoadingScreen onComplete={() => {}} />;
  }
  
  if (authFailed) {
    return <LoadingScreen onComplete={() => {}} />;
  }

  return <>{children}</>
}