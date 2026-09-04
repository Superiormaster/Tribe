import React, {
  createContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest, setAccessToken } from "@/utils/api";
import { getRefreshToken } from "@/lib/keyStore";
import { logout } from "@/utils/auth";
import LoadingScreen from "@/components/LoadingScreen";
import {
  isSessionExpired,
  startActivityTracking,
} from "@/lib/activity";
import { useNavigation } from "@/utils/useNavigation";
import { REFRESH_HOME_EVENT } from "@/lib/authEvents";
import {
  saveCachedUser,
  getCachedUser,
} from "@/lib/userCache";
import { updateSocketAccessToken } from "@/lib/globalSocket/updateSocketAccessToken";
import { useNetwork } from "@/components/networkConnection/NetworkContext";

import { DeviceEventEmitter } from "react-native";

interface UserContextType {
  user: any | null;
  setUser: (user: any | null) => void;

  loadingUser: boolean;
  authReady: boolean;
  authFailed: boolean;
  setAuthFailed: (v: boolean) => void;

  mutedUserIds: Set<number>;
  blockedUserIds: Set<number>;

  addMutedUser: (userId: number) => void;
  removeMutedUser: (userId: number) => void;

  addBlockedUser: (userId: number) => void;
  removeBlockedUser: (userId: number) => void;
}

export const UserContext =
  createContext<UserContextType | null>(null);

export function UserProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<any | null>(null);

  const [loadingUser, setLoadingUser] =
    useState(true);

  const [isInactive, setIsInactive] =
    useState(false);

  const [authReady, setAuthReady] =
    useState(false);

  const [authFailed, setAuthFailed] =
    useState(false);

  const { isOnline } = useNetwork();

  const { replace } =
    useNavigation();

  const isOnlineRef =
    useRef(isOnline);

  const [mutedUserIds, setMutedUserIds] =
    useState<Set<number>>(new Set());

  const [blockedUserIds, setBlockedUserIds] =
    useState<Set<number>>(new Set());

  /*
   * Keep latest network state
   */
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  /*
   * Muted users
   */
  const addMutedUser = useCallback(
    (userId: number) => {
      setMutedUserIds((prev) => {
        const next = new Set(prev);

        next.add(Number(userId));

        return next;
      });
    },
    []
  );

  const removeMutedUser = useCallback(
    (userId: number) => {
      setMutedUserIds((prev) => {
        const next = new Set(prev);

        next.delete(Number(userId));

        return next;
      });
    },
    []
  );

  /*
   * Blocked users
   */
  const addBlockedUser = useCallback(
    (userId: number) => {
      setBlockedUserIds((prev) => {
        const next = new Set(prev);

        next.add(Number(userId));

        return next;
      });
    },
    []
  );

  const removeBlockedUser = useCallback(
    (userId: number) => {
      setBlockedUserIds((prev) => {
        const next = new Set(prev);

        next.delete(Number(userId));

        return next;
      });
    },
    []
  );

  /*
   * Activity tracking
   */
  useEffect(() => {
    const cleanup =
      startActivityTracking(() => {
        setIsInactive(true);
      });

    return cleanup;
  }, []);

  /*
   * INITIAL AUTHENTICATION
   */
  const initAuth = useCallback(
    async () => {
      setAuthFailed(false);
      setLoadingUser(true);

      try {
        /*
         * Check local session
         */
        if (isSessionExpired()) {
          console.log(
            "Local session expired. Attempting refresh..."
          );
        }

        /*
         * Get active account
         *
         * localStorage -> AsyncStorage
         */
        const selected =
          await AsyncStorage.getItem(
            "active_account"
          );

        console.log(
          "selected",
          selected
        );

        let cached = null;

        /*
         * Restore cached user immediately
         */
        if (selected) {
          cached =
            await getCachedUser(selected);

          if (cached) {
            setUser(cached);
            setLoadingUser(false);
          }
        }

        /*
         * No active account
         */
        if (!selected) {
          setAuthFailed(true);
          setUser(null);

          return;
        }

        /*
         * Get refresh token
         */
        const refresh =
          await getRefreshToken(selected);

        console.log(
          "refresh exists",
          !!refresh
        );

        if (!refresh) {
          setAuthFailed(true);
          setUser(null);

          return;
        }

        /*
         * Refresh access token
         */
        const res =
          await apiRequest(
            "api/users/refresh/",
            {
              method: "POST",
              data: {
                refresh,
              },
            }
          );

        /*
         * Restore access token
         */
        setAccessToken(
          res.access
        );

        updateSocketAccessToken(
          res.access
        );

        console.log(
          "refresh success"
        );

        /*
         * Fetch current user
         */
        const profile =
          await apiRequest(
            "api/users/me/"
          );

        console.log(
          "profile",
          profile
        );

        /*
         * Fetch blocks + mutes
         */
        const [
          blocks,
          mutes,
        ] = await Promise.all([
          apiRequest(
            "api/users/blocks/"
          ),
          apiRequest(
            "api/users/mutes/"
          ),
        ]);

        const blockedList =
          Array.isArray(blocks)
            ? blocks
            : blocks?.results || [];

        const mutedList =
          Array.isArray(mutes)
            ? mutes
            : mutes?.results || [];

        /*
         * Blocked IDs
         */
        setBlockedUserIds(
          new Set(
            blockedList
              .map((item: any) =>
                Number(
                  item.blocked_user_id ??
                    item.user_id ??
                    item.blocked_user?.id ??
                    item.id
                )
              )
              .filter(Boolean)
          )
        );

        /*
         * Muted IDs
         */
        setMutedUserIds(
          new Set(
            mutedList
              .map((item: any) =>
                Number(
                  item.muted_user_id ??
                    item.user_id ??
                    item.muted_user?.id ??
                    item.id
                )
              )
              .filter(Boolean)
          )
        );

        /*
         * Check if cached user changed
         */
        const sameUser =
          cached &&
          cached.id === profile.id &&
          cached.username ===
            profile.username &&
          cached.avatar ===
            profile.avatar &&
          cached.tokens ===
            profile.tokens;

        if (!sameUser) {
          setUser(profile);

          await saveCachedUser(
            profile
          );
        }

        /*
         * Always update cache
         */
        await saveCachedUser(
          profile
        );

        /*
         * Save last seen
         */
        await AsyncStorage.setItem(
          "last_seen",
          Date.now().toString()
        );

        setAuthFailed(false);
      } catch (err: any) {
        console.error(
          "Auth init failed",
          err
        );

        /*
         * Network/server problem
         *
         * Keep cached session.
         */
        if (
          !isOnlineRef.current ||
          isNetworkError(err)
        ) {
          console.log(
            "Offline. Keeping previous session."
          );

          return;
        }

        /*
         * Invalid refresh token
         */
        if (
          err?.status === 401 ||
          err?.status === 403
        ) {
          setAuthFailed(true);
          setUser(null);

          return;
        }

        /*
         * Server error
         */
        if (
          err?.status >= 500
        ) {
          return;
        }

        console.log(
          "Temporary server error."
        );
      } finally {
        setLoadingUser(false);
        setAuthReady(true);
      }
    },
    []
  );

  /*
   * Run authentication once
   */
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  /*
   * AUTH CHANGED EVENT
   *
   * Web:
   * window.addEventListener(...)
   *
   * React Native:
   * DeviceEventEmitter
   */
  useEffect(() => {
    const subscription =
      DeviceEventEmitter.addListener(
        "auth-changed",
        async () => {
          console.log(
            "auth-changed fired"
          );

          const active =
            await AsyncStorage.getItem(
              "active_account"
            );

          console.log(
            "active account:",
            active
          );

          if (!active) {
            setUser(null);
            setAuthFailed(true);

            return;
          }

          await initAuth();

          console.log(
            "initAuth finished"
          );

          /*
           * Notify listeners
           */
          DeviceEventEmitter.emit(
            "auth-changed-complete"
          );
        }
      );

    return () => {
      subscription.remove();
    };
  }, [initAuth]);

  /*
   * AUTH CHANGED COMPLETE
   */
  useEffect(() => {
    const subscription =
      DeviceEventEmitter.addListener(
        "auth-changed-complete",
        () => {
          replace("/main/home");
        }
      );

    return () => {
      subscription.remove();
    };
  }, [replace]);

  /*
   * AUTOMATIC TOKEN REFRESH
   *
   * Runs every 60 seconds.
   */
  useEffect(() => {
    const interval =
      setInterval(async () => {
        /*
         * Don't refresh while offline
         */
        if (!isOnline) {
          return;
        }

        /*
         * Token still valid
         */
        if (!isSessionExpired()) {
          return;
        }

        try {
          const selected =
            await AsyncStorage.getItem(
              "active_account"
            );

          if (!selected) {
            logout();

            return;
          }

          const refresh =
            await getRefreshToken(
              selected
            );

          if (!refresh) {
            logout();

            return;
          }

          /*
           * Refresh token
           */
          const res =
            await apiRequest(
              "api/users/refresh/",
              {
                method: "POST",
                data: {
                  refresh,
                },
              }
            );

          /*
           * Update access token
           */
          setAccessToken(
            res.access
          );

          updateSocketAccessToken(
            res.access
          );

          await AsyncStorage.setItem(
            "last_seen",
            Date.now().toString()
          );
        } catch (err: any) {
          console.error(
            "Session refresh failed",
            err
          );

          /*
           * Network problem
           */
          if (
            !isOnline ||
            isNetworkError(err)
          ) {
            return;
          }

          /*
           * Invalid refresh token
           */
          if (
            err?.status === 401 ||
            err?.status === 403
          ) {
            logout();

            return;
          }

          /*
           * Server error
           */
          if (
            err?.status >= 500
          ) {
            return;
          }
        }
      }, 60 * 1000);

    return () =>
      clearInterval(interval);
  }, [isOnline]);

  /*
   * REFRESH HOME
   *
   * Replaces:
   *
   * window.addEventListener(
   *   REFRESH_HOME_EVENT
   * )
   */
  useEffect(() => {
    const subscription =
      DeviceEventEmitter.addListener(
        REFRESH_HOME_EVENT,
        async () => {
          setIsInactive(false);

          try {
            const selected =
              await AsyncStorage.getItem(
                "active_account"
              );

            if (!selected) {
              setAuthFailed(true);
              setUser(null);

              return;
            }

            /*
             * Get refresh token
             */
            const refresh =
              await getRefreshToken(
                selected
              );

            if (!refresh) {
              setAuthFailed(true);
              setUser(null);

              return;
            }

            /*
             * Refresh token
             */
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

            /*
             * Update access token
             */
            setAccessToken(
              token.access
            );

            updateSocketAccessToken(
              token.access
            );

            /*
             * Get profile
             */
            const profile =
              await apiRequest(
                "api/users/me/"
              );

            setUser(profile);

            /*
             * Update last seen
             */
            await AsyncStorage.setItem(
              "last_seen",
              Date.now().toString()
            );

            /*
             * Update cache
             */
            await saveCachedUser(
              profile
            );

            setAuthFailed(false);

            /*
             * Go home
             */
            replace("/main/home");
          } catch (err: any) {
            console.error(
              err
            );

            /*
             * Network problem
             */
            if (
              !isOnline ||
              isNetworkError(err)
            ) {
              return;
            }

            /*
             * Server error
             */
            if (
              err?.status >= 500
            ) {
              return;
            }

            /*
             * Invalid refresh
             */
            if (
              err?.status === 401 ||
              err?.status === 403
            ) {
              logout();
            }
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [
    replace,
    isOnline,
  ]);

  /*
   * Debug user changes
   */
  useEffect(() => {
    console.log(
      "UserContext user =",
      user
    );
  }, [user]);

  /*
   * Context value
   */
  const value =
    useMemo(
      () => ({
        user,
        setUser,

        loadingUser,

        authReady,

        authFailed,
        setAuthFailed,

        mutedUserIds,
        blockedUserIds,

        addMutedUser,
        removeMutedUser,

        addBlockedUser,
        removeBlockedUser,
      }),
      [
        user,
        loadingUser,
        authReady,
        authFailed,

        mutedUserIds,
        blockedUserIds,

        addMutedUser,
        removeMutedUser,

        addBlockedUser,
        removeBlockedUser,
      ]
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

/*
 * Detect network errors
 */
function isNetworkError(
  err: any
) {
  const message =
    err?.message?.toLowerCase() || "";

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