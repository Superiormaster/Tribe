"use client";

import {
  createContext,
  useState,
  useMemo,
  useContext,
  useEffect,
  ReactNode,
} from "react";

import { apiRequest } from "@/utils/api";
import { UserContext } from "@/components/UserContext";
import { connectNotificationSocket } from "@/lib/notifications-socket";

import {
  usePushNotifications,
} from "@/utils/notifications/usePushNotifications";

import { useNetwork } from "@/components/networkConnection/NetworkContext";

interface NotificationContextType {
  notifications: any[];
  count: number;
  setCount: React.Dispatch<React.SetStateAction<number>>;
  addNotification: (n: any) => void;
  toast: any | null;
  dismissToast: () => void;
  refreshNotificationCount: () => Promise<void>;
}

export const NotificationContext =
  createContext<NotificationContextType>({
    notifications: [],
    count: 0,
    setCount: () => {},
    addNotification: () => {},
    toast: null,
    dismissToast: () => {},
    refreshNotificationCount: async () => {},
  });

export const NotificationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toast, setToast] = useState<any | null>(null);
  const [count, setCount] = useState(0);

  const { user } = useContext(UserContext) || {};
  const { isOnline } = useNetwork();

  usePushNotifications(user?.id);

  const refreshNotificationCount = async () => {
    try {
      const data = await apiRequest(
        "api/notifications/?page=1"
      );

      if (
        typeof data?.unread_count === "number"
      ) {
        setCount(data.unread_count);
      }

      if (Array.isArray(data?.results)) {
        setNotifications(data.results);
      }
    } catch (error) {
      console.error(
        "[Notifications] Failed to refresh count:",
        error
      );
    }
  };

  const addNotification = (notification: any) => {
    setNotifications((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.group_key &&
          notification.group_key &&
          item.group_key === notification.group_key
      );

      if (existingIndex !== -1) {
        const existing = prev[existingIndex];

        if (!existing.read) {
          return prev.map((item, index) =>
            index === existingIndex
              ? {
                  ...item,
                  ...notification,
                  read: false,
                }
              : item
          );
        }

        setCount((current) => current + 1);

        return prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                ...notification,
                read: false,
              }
            : item
        );
      }

      /*
       * Completely new notification.
       */
      if (!notification.read) {
        setCount((current) => current + 1);

        setToast(notification);

        setTimeout(() => {
          setToast(null);
        }, 4000);
      }

      return [
        {
          ...notification,
          read: false,
        },
        ...prev,
      ];
    });
  };

  const dismissToast = () => {
    setToast(null);
  };

  useEffect(() => {
    if (!user || !isOnline) return;

    refreshNotificationCount();
  }, [user?.id, isOnline]);

  useEffect(() => {
    if (!user) return;

    let ws: WebSocket | null = null;
    let cancelled = false;

    const connect = async () => {
      try {
        ws = await connectNotificationSocket();

        if (!ws || cancelled) return;

        ws.onmessage = (event) => {
          try {
            const notification =
              JSON.parse(event.data);

            console.log(
              "[NotificationProvider] LIVE:",
              notification
            );

            addNotification(notification);
          } catch (error) {
            console.error(
              "[Notifications] Invalid socket data:",
              error
            );
          }
        };
      } catch (error) {
        console.error(
          "[Notifications] Socket connection failed:",
          error
        );
      }
    };

    connect();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [user?.id]);

  const value = useMemo(
    () => ({
      notifications,
      count,
      setCount,
      addNotification,
      toast,
      dismissToast,
      refreshNotificationCount,
    }),
    [
      notifications,
      count,
      toast,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};