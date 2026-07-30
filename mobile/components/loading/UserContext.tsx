import React, {
  createContext,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AppState } from "react-native";

import { apiRequest, setAccessToken } from "@/utils/api";
import { getRefreshToken, getActiveAccount } from "@/lib/keyStore";
import { logout } from "@/utils/auth";
import LoadingScreen from "@/components/LoadingScreen";
import {
  isSessionExpired,
  startActivityTracking,
} from "@/lib/activity";
import { useNavigation } from "@/utils/useNavigation";
import {
  addRefreshHomeListener,
} from "@/lib/authEvents";

interface UserContextType {
  user: any | null;
  setUser: (user: any) => void;
  loadingUser: boolean;
}

export const UserContext =
  createContext<UserContextType | null>(
    null
  );

export function UserProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<any>(null);

  const [loadingUser, setLoadingUser] =
    useState(true);

  const [isInactive, setIsInactive] =
    useState(false);

  const { replace } =
    useNavigation();

  const renders = useRef(0);
  renders.current++;

  console.log(
    "UserProvider",
    renders.current
  );

  /**
   * Activity Tracking
   */
  useEffect(() => {
    const cleanup =
      startActivityTracking(() => {
        setIsInactive(true);
      });

    return cleanup;
  }, []);

  /**
   * Restore Login
   */
  useEffect(() => {
    async function initAuth() {
      try {
        if (
          await isSessionExpired()
        ) {
          setUser(null);
          return;
        }

        const selected =
          await getActiveAccount();

        if (!selected) {
          setUser(null);
          return;
        }

        const refresh =
          await getRefreshToken(
            selected
          );

        if (!refresh) {
          setUser(null);
          return;
        }

        const token =
          await apiRequest(
            "api/users/refresh/",
            {
              method: "POST",
              data: {
                refresh,
              },
            }
          );

        setAccessToken(
          token.access
        );

        const profile =
          await apiRequest(
            "api/users/me/"
          );

        setUser(profile);
      } catch (e) {
        console.error(e);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }

    initAuth();
  }, []);

  /**
   * Session Expiration
   */
  useEffect(() => {
    const interval =
      setInterval(async () => {
        if (
          await isSessionExpired()
        ) {
          logout();
        }
      }, 60 * 1000);

    return () =>
      clearInterval(interval);
  }, []);

  /**
   * Refresh Home Event
   */
  useEffect(() => {
    const remove =
      addRefreshHomeListener(
        async () => {
          setIsInactive(false);

          try {
            const selected =
              await getActiveAccount();

            if (!selected) {
              replace("/");
              return;
            }

            const refresh =
              await getRefreshToken(
                selected
              );

            if (!refresh) {
              replace("/");
              return;
            }

            const token =
              await apiRequest(
                "api/users/refresh/",
                {
                  method: "POST",
                  data: {
                    refresh,
                  },
                }
              );

            setAccessToken(
              token.access
            );

            const profile =
              await apiRequest(
                "api/users/me/"
              );

            setUser(profile);

            replace("/main/home");
          } catch {
            logout();
          }
        }
      );

    return remove;
  }, [replace]);

  /**
   * App Foreground
   */
  useEffect(() => {
    const sub =
      AppState.addEventListener(
        "change",
        (state) => {
          if (
            state === "active"
          ) {
            startActivityTracking();
          }
        }
      );

    return () =>
      sub.remove();
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loadingUser,
    }),
    [user, loadingUser]
  );

  return (
    <>
      {isInactive && (
        <LoadingScreen
          refreshOnComplete
          onComplete={() =>
            setIsInactive(false)
          }
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