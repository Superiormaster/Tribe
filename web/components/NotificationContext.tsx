'use client'

import { createContext, useState, useMemo, useContext, useEffect, ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import { apiRequest } from "@/utils/api";
import { UserContext } from "@/components/UserContext";
import { connectNotificationSocket } from "@/lib/notifications-socket";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { app } from "@/lib/firebase";

interface NotificationContextType {
  notifications: any[];
  count: number;
  setCount: React.Dispatch<React.SetStateAction<number>>;
  addNotification: (n: any) => void;
  toast: any | null;
  dismissToast: () => void;
}

export const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  count: 0,
  setCount: () => {},
  addNotification: () => {},
  toast: null,
  dismissToast: () => {},
});

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toast, setToast] = useState<any | null>(null);
  const [count, setCount] = useState(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { user } = useContext(UserContext) || {};
  const { isOnline } = useNetwork();

  const normalizeNotifications = (data: any) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const loadNotifications = async () => {
    try {
      const data = await apiRequest("api/notifications/");
      setNotifications(normalizeNotifications(data));
    } catch (err) {
      console.error(err);
    }
  };
  
  // Add a notification safely (no duplicates)
  const addNotification = (n: any) => {
    setNotifications(prev => {
      const list = Array.isArray(prev) ? prev : [];
  
      if (list.find(item => item.id === n.id)) return list;
  
      return [n, ...list];
    });
  
    if (!n.read && n.actor?.id !== user?.id) {
        setCount(prev => prev + 1);
        setToast(n);
        setTimeout(() => setToast(null), 4000);
    }
  };
  
  const dismissToast = () => setToast(null);

  useEffect(() => {
    const setupPush = async () => {
      try {
        if (!user) return;
  
        if (
          typeof window === "undefined" ||
          !("serviceWorker" in navigator) ||
          !("Notification" in window)
        ) {
          return;
        }
  
        const supported = await isSupported();
  
        if (!supported) {
          console.log("Messaging not supported");
          return;
        }
  
        const permission = await Notification.requestPermission();
  
        console.log("Permission:", permission);
  
        if (permission !== "granted") {
          return;
        }
  
        const messaging = getMessaging(app);
  
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );
  
        let token = null;
  
        try {
          token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });
  
          console.log("FCM TOKEN:", token);
  
        } catch (error) {
          console.warn("FCM token update failed:", error);
          return;
        }
  
        if (!token) {
          console.warn("No FCM token received");
          return;
        }
  
        await apiRequest("api/users/fcm-token/", {
          method: "POST",
          data: {
            token,
          },
        });
  
      } catch (error) {
        console.warn("Push notification setup failed:", error);
      }
    };
  
    setupPush();
  
  }, [user]);
  
  useEffect(() => {
    if (!isOnline) return;
  
    const refreshNotifications = async () => {
      try {
        const data = await apiRequest("api/notifications/?page=1");
  
        const list = normalizeNotifications(data);
  
        setNotifications(list);
  
        const unread = list.filter(
          (n: any) => !n.read
        ).length;
  
        setCount(unread);
  
      } catch (err) {
        console.error("Notification refresh failed", err);
      }
    };
  
    refreshNotifications();
  
  }, [isOnline]);
  
  useEffect(() => {
    // Load first page and count unread
    apiRequest("api/notifications/?page=1").then(data => {
      const list = normalizeNotifications(data);
    
      setNotifications(list);
    
      const unread = list.filter((n: any) => !n.read).length;
      setCount(unread);
    });
    
    let ws: WebSocket | null = null;
  
    const connect =
      async () => {
        ws =
          await connectNotificationSocket();
  
        if (!ws) return;
  
        ws.onmessage =
          event => {
            const notification =
              JSON.parse(event.data);
  
            console.log(notification);
            addNotification(
              notification
            );
          };
  
        setSocket(ws);
      };
  
    connect();
  
    return () => {
      ws?.close();
    };
  }, []);
  
  const value = useMemo(() => ({
    notifications, 
    count, 
    setCount, 
    addNotification, 
    toast, 
    dismissToast,
  }), [
    notifications, 
    count, 
    setCount, 
    addNotification, 
    toast, 
    dismissToast,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};