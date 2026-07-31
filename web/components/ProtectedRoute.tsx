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
      if (!authReady && !authFailed) return;
  
      replace("/auth/login");
  }, [
      authReady,
      authFailed,
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