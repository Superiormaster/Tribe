"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { apiRequest, setAccessToken } from "@/utils/api";
import { getRefreshToken } from "@/lib/keyStore"
import LoadingScreen from '@/components/LoadingScreen';
import { isSessionExpired, startActivityTracking } from "@/lib/activity";

interface UserContextType {
  user: any | null;
  setUser: (user: any) => void;
  loadingUser: boolean;
}

export const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isInactive, setIsInactive] = useState(false);
  
  useEffect(() => {
    const cleanup = startActivityTracking(() => {
      setIsInactive(true);
    });
  
    return cleanup;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSessionExpired()) {
          setUser(null);
          setLoadingUser(false);
          return;
        }

        const refresh = await getRefreshToken(); 
  
        if (!refresh) {
          setUser(null);
          setLoadingUser(false); 
          return;
        }
  
        // 2. Get new access token
        const res = await apiRequest("api/users/refresh/", {
          method: "POST",
          data: { refresh },
        });

        // 3. Restore access token in memory
        setAccessToken(res.access);
  
        // 4. Fetch user
        const profile = await apiRequest("api/users/me/");
        setUser(profile);
  
      } catch (err) {
        console.error("Auth init failed", err);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
  
    initAuth();
  }, []);
  
  {isInactive && <LoadingScreen onComplete={() => setIsInactive(false)} />}

  return (
    <UserContext.Provider value={{ user, setUser, loadingUser }}>
      {children}
    </UserContext.Provider>
  );
}