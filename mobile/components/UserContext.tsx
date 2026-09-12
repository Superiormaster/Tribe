import {
  createContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { DeviceEventEmitter } from "react-native";
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
import { saveCachedUser, getCachedUser } from "@/lib/userCache";
import { updateSocketAccessToken } from "@/lib/globalSocket/updateSocketAccessToken";
import { useNetwork } from "@/components/networkConnection/NetworkContext";

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
  const [user, setUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isInactive, setIsInactive] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  const { isOnline } = useNetwork();
  const { replace } = useNavigation();

  const isOnlineRef = useRef(isOnline);

  const [mutedUserIds, setMutedUserIds] =
    useState<Set<number>>(new Set());

  const [blockedUserIds, setBlockedUserIds] =
    useState<Set<number>>(new Set());

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

  const addMutedUser = useCallback((userId: number) => {
    setMutedUserIds((prev) => {
      const next = new Set(prev);
      next.add(Number(userId));
      return next;
    });
  }, []);

  const removeMutedUser = useCallback((userId: number) => {
    setMutedUserIds((prev) => {
      const next = new Set(prev);
      next.delete(Number(userId));
      return next;
    });
  }, []);

  const addBlockedUser = useCallback((userId: number) => {
    setBlockedUserIds((prev) => {
      const next = new Set(prev);
      next.add(Number(userId));
      return next;
    });
  }, []);

  const removeBlockedUser = useCallback((userId: number) => {
    setBlockedUserIds((prev) => {
      const next = new Set(prev);
      next.delete(Number(userId));
      return next;
    });
  }, []);

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
        console.log(
          "Local session expired. Attempting refresh..."
        );
      }

      const selected =
        await AsyncStorage.getItem("active_account");

      console.log("selected", selected);

      let cached = null;

      /*
       * Restore cached user immediately.
       */

      if (selected) {
        cached = await getCachedUser(selected);

        if (cached) {
          setUser(cached);
          setLoadingUser(false);
        }
      }

      /*
       * No active account.
       */

      if (!selected) {
        setAuthFailed(true);
        setUser(null);
        return;
      }

      /*
       * Get refresh token.
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
       * Refresh access token.
       */

      const res = await apiRequest(
        "api/users/refresh/",
        {
          method: "POST",
          data: {
            refresh,
          },
        }
      );

      /*
       * Restore access token in memory.
       */

      setAccessToken(res.access);

      updateSocketAccessToken(
        res.access
      );

      console.log("refresh success");

      /*
       * Fetch current profile.
       */

      const profile =
        await apiRequest("api/users/me/");

      console.log("profile", profile);

      /*
       * Fetch blocks and mutes.
       */

      const [blocks, mutes] =
        await Promise.all([
          apiRequest("api/users/blocks/"),
          apiRequest("api/users/mutes/"),
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
       * Restore blocked users.
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
       * Restore muted users.
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

      if (
        !isOnlineRef.current ||
        isNetworkError(err)
      ) {
        console.log(
          "Offline. Keeping previous session."
        );
        return;
      }

      if (
        err?.status === 401 ||
        err?.status === 403
      ) {
        setAuthFailed(true);
        setUser(null);
        return;
      }

      if (err?.status >= 500) {
        return;
      }

      console.log(
        "Temporary server error."
      );
    } finally {
      setLoadingUser(false);
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

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

          DeviceEventEmitter.emit(
            "auth-changed-complete"
          );
        }
      );

    return () => {
      subscription.remove();
    };
  }, [initAuth]);

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

  useEffect(() => {
    const interval = setInterval(
      async () => {
        if (!isOnline) {
          return;
        }

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

          if (
            !isOnline ||
            isNetworkError(err)
          ) {
            return;
          }

          if (
            err?.status === 401 ||
            err?.status === 403
          ) {
            logout();
            return;
          }

          if (err?.status >= 500) {
            return;
          }
        }
      },
      60 * 1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [isOnline]);

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

            const refresh =
              await getRefreshToken(
                selected
              );

            if (!refresh) {
              setAuthFailed(true);
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

            updateSocketAccessToken(
              token.access
            );

            const profile =
              await apiRequest(
                "api/users/me/"
              );

            setUser(profile);

            await AsyncStorage.setItem(
              "last_seen",
              Date.now().toString()
            );

            await saveCachedUser(
              profile
            );

            setAuthFailed(false);

            replace("/main/home");
          } catch (err: any) {
            console.error(err);

            if (
              !isOnline ||
              isNetworkError(err)
            ) {
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
        }
      );

    return () => {
      subscription.remove();
    };
  }, [replace, isOnline]);

  useEffect(() => {
    console.log(
      "UserContext user =",
      user
    );
  }, [user]);

  const value = useMemo(
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

      <UserContext.Provider value={value}>
        {children}
      </UserContext.Provider>
    </>
  );
}

function isNetworkError(err: any) {
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