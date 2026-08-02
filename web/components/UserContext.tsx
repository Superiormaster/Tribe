"use client";

import { createContext, useMemo, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { apiRequest, setAccessToken } from "@/utils/api";
import { getRefreshToken } from "@/lib/keyStore"
import { logout } from "@/utils/auth"
import LoadingScreen from '@/components/LoadingScreen';
import { isSessionExpired, startActivityTracking } from "@/lib/activity";
import { useNavigation } from "@/utils/useNavigation"
import { REFRESH_HOME_EVENT } from "@/lib/authEvents";
import { saveCachedUser, getCachedUser } from "@/lib/userCache";
import { useNetwork } from "@/components/networkConnection/NetworkContext";

interface UserContextType {
  user: any | null;
  setUser: (user: any | null) => void;
  loadingUser: boolean;
  authReady: boolean;
  authFailed: boolean;
  setAuthFailed: (v: boolean) => void;
}

export const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isInactive, setIsInactive] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const { isOnline } = useNetwork();
  const { replace } = useNavigation();
  const isOnlineRef = useRef(isOnline);
  
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);
  
  const renders = useRef(0);
  renders.current++;
  
  const previous = useRef({
      user,
      loadingUser,
      authReady,
      authFailed,
      isInactive,
  });
  
  useEffect(() => {
      console.log({
          userChanged: previous.current.user !== user,
          loadingChanged:
              previous.current.loadingUser !== loadingUser,
          readyChanged:
              previous.current.authReady !== authReady,
          failedChanged:
              previous.current.authFailed !== authFailed,
          inactiveChanged:
              previous.current.isInactive !== isInactive,
      });
  
      previous.current = {
          user,
          loadingUser,
          authReady,
          authFailed,
          isInactive,
      };
  });
  
  useEffect(() => {
    const cleanup = startActivityTracking(() => {
      setIsInactive(true);
    });
  
    return cleanup;
  }, []);

  const initAuth = useCallback(async () => {
      setAuthFailed(false);
      setLoadingUser(true);
  
      try {
        if (isSessionExpired()) {
          console.log("Local session expired. Attempting refresh...");
        }
  
        const selected = localStorage.getItem("active_account");
        console.log("selected", selected);

        let cached = null;
        
        if (selected) {
            cached = await getCachedUser(selected);
        
            if (cached) {
                setUser(cached);
                setLoadingUser(false);
            }
        }
  
        if (!selected) {
          setAuthFailed(true);
          setUser(null);
          return;
        }

        const refresh = await getRefreshToken(selected); 
        console.log("refresh exists", !!refresh);
  
        if (!refresh) {
          setAuthFailed(true);
          setUser(null);
          return;
        }
  
        // 2. Get new access token
        const res = await apiRequest("api/users/refresh/", {
          method: "POST",
          data: { refresh },
        });

        // 3. Restore access token in memory
        setAccessToken(res.access);
        
        console.log("refresh success");
  
        // 4. Fetch user
        const profile = await apiRequest("api/users/me/");
        console.log("profile", profile);
  
        const sameUser =
            cached &&
            cached.id === profile.id &&
            cached.username === profile.username &&
            cached.avatar === profile.avatar &&
            cached.tokens === profile.tokens;
        
        if (!sameUser) {
          setUser(profile);
          await saveCachedUser(profile);
        }

        await saveCachedUser(profile);

        localStorage.setItem(
          "last_seen",
          Date.now().toString()
        );
        setAuthFailed(false);
  
      } catch (err: any) {
        console.error("Auth init failed", err);

        // Network/server issue
        if (!isOnlineRef.current || isNetworkError(err)) {
            console.log("Offline. Keeping previous session.");
            return;
        }
  
        // Invalid refresh token
        if (
          err?.status === 401 ||
          err?.status === 403
        ) {
          setAuthFailed(true);
          setUser(null);
          return;
        }
  
        // Server error (500, timeout, etc.)
        if (err?.status >= 500) {
          return;
        }
        console.log("Temporary server error.");
      } finally {
        setLoadingUser(false);
        setAuthReady(true);
      }
  
  }, []);
  
  useEffect(() => {
    initAuth();
  }, [initAuth]);
  
  useEffect(() => {
    const handleAuthChanged = async () => {
      console.log("auth-changed fired");
      const active =
        localStorage.getItem("active_account");
      console.log("active account:", active);
    
      if (!active) {
        setUser(null);
        setAuthFailed(true);
        return;
      }
    
      await initAuth();
      console.log("initAuth finished");
    };
  
    window.addEventListener("auth-changed", handleAuthChanged);
  
    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, [initAuth]);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isOnline) {
        return;
      }
  
      if (!isSessionExpired()) {
        return;
      }
  
      try {
        const selected =
          localStorage.getItem("active_account");
  
        if (!selected) {
          logout();
          return;
        }
  
        const refresh =
          await getRefreshToken(selected);
  
        if (!refresh) {
          logout();
          return;
        }
  
        const res = await apiRequest(
          "api/users/refresh/",
          {
            method: "POST",
            data: { refresh },
          }
        );
  
        setAccessToken(res.access);
        localStorage.setItem(
          "last_seen",
          Date.now().toString()
        );
  
      } catch (err: any) {
        console.error("Session refresh failed", err);
  
        // Network problem or server temporarily unavailable
        if (!isOnline || isNetworkError(err)) {
          return;
        }

        // Refresh token is invalid
        if (
          err?.status === 401 ||
          err?.status === 403
        ) {
          logout();
        }
  
        // Ignore 500/502/503/timeouts.
        // The app will retry on the next interval.
        if (err?.status >= 500) {
          return;
        }
      }
    }, 60 * 1000);
  
    return () => clearInterval(interval);
  }, [isOnline]);
  
  useEffect(() => {
    const handler = async () => {
      setIsInactive(false);

      try {
          const selected =
              localStorage.getItem("active_account");
  
          if (!selected) {
              setAuthFailed(true);
              setUser(null);
              return;
          }
  
          const refresh =
              await getRefreshToken(selected);
  
          if (!refresh) {
              setAuthFailed(true);
              setUser(null);
              return;
          }
  
          const token =
              await apiRequest("api/users/refresh/", {
                  method: "POST",
                  data: { refresh }
              });
  
          setAccessToken(token.access);
  
          const profile =
              await apiRequest("api/users/me/");
  
          setUser(profile);
          localStorage.setItem(
            "last_seen",
            Date.now().toString()
          );
          await saveCachedUser(profile);
          setAuthFailed(false);
          replace("/main/home");
      } catch (err: any) {
          console.error(err);
      
          if (!isOnline || isNetworkError(err)) {
              return;
          }
      
          if (err?.status >= 500) {
            return;
          }
    
          if (
              err?.status === 401 ||
              err?.status === 403
          ) {
              logout();
          }
      }
    };
  
    window.addEventListener(
      REFRESH_HOME_EVENT,
      handler
    );
  
    return () => {
      window.removeEventListener(REFRESH_HOME_EVENT, handler);
    };
  }, [replace, isOnline]);
  
  useEffect(() => {
    console.log("UserContext user =", user);
  }, [user]);
  
  const value = useMemo(
    () => ({
      user,
      setUser,
      loadingUser,
      authReady,
      authFailed,
      setAuthFailed,
    }),
    [user, loadingUser, authReady, authFailed, setAuthFailed]
  );
  
  return (
    <>
      {isInactive && (
        <LoadingScreen
          refreshOnComplete
          onComplete={() => setIsInactive(false)}
        />
      )}
  
      <UserContext.Provider
        value={value}
      >
        {children}
      </UserContext.Provider>
    </>
  );
}

function isNetworkError(err: any) {
  const message = err?.message?.toLowerCase() || "";

  return (
    err instanceof TypeError ||
    err?.name === "TypeError" ||
    err?.name === "NetworkError" ||
    err?.name === "AbortError" ||
    err?.code === "ECONNABORTED" ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  );
}