'use client'

import { createContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/utils/api";

interface NotificationContextType {
  notifications: any[];
  count: number;
  setCount: (c: number) => void;
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

  const loadNotifications = async () => {
    try {
      const data = await apiRequest("api/notifications/");
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };
  
  // Add a notification safely (no duplicates)
  const addNotification = (n: any) => {
    setNotifications(prev => {
      if (prev.find(item => item.id === n.id)) return prev;
      return [n, ...prev];
    });
    setCount(prev => prev + 1);
    setToast(n);
    setTimeout(() => setToast(null), 4000); 
  };
  
  const dismissToast = () => setToast(null);

  useEffect(() => {
    // Load first page and count unread
    apiRequest("api/notifications/?page=1").then(data => {
      setNotifications(data.results);
      const unread = data.results.filter((n: any) => !n.read).length;
      setCount(unread);
    });

    // Open WebSocket globally
    const ws = new WebSocket("ws://localhost:8000/ws/notifications/");
    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      addNotification(data);
    };
    setSocket(ws);
    loadNotifications()

    return () => ws.close();
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, count, setCount, addNotification, toast, dismissToast }}>
      {children}
    </NotificationContext.Provider>
  );
};