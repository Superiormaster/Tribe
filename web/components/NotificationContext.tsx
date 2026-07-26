'use client'

import { createContext, useState, useMemo, useContext, useEffect, ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import { apiRequest } from "@/utils/api";
import { UserContext } from "@/components/UserContext";
import { connectNotificationSocket } from "@/lib/notifications-socket";

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