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
    console.log("ProtectedRoute", {
        authReady,
        loadingUser,
        authFailed,
        user,
    });

    if (!authReady || loadingUser) return;
    if (!isOnline) return;

    if (authFailed) {
        console.log("Redirect because authFailed");
        replace("/auth/login");
        return;
    }

    if (!user) {
        console.log("Redirect because user is null");
        replace("/auth/login");
    }
  }, [authReady, loadingUser, authFailed, user, isOnline]);

  if (!authReady || loadingUser) {
    return null;
  }
  
  if (authFailed || !user) {
      return null;
  }
  
  return children;
}