'use client'

import { useEffect, useState } from 'react'
import { useContext } from "react"
import { apiRequest } from '@/utils/api'
import { Bell } from 'lucide-react'
import { NotificationContext } from "@/components/NotificationContext"
import { connectNotificationSocket } from "@/lib/notifications-socket";
import { useNavigation } from "@/utils/useNavigation"

export default function NotificationsPage() {
  const { push } = useNavigation();
  const [notifications, setNotifications] = useState<any[]>([])
  const { count, setCount } = useContext(NotificationContext)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(true)
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    loadNotifications(true)
  }, [])
  
  const loadNotifications = async (reset = false) => {
    const pageToLoad = reset ? 1 : page;
  
    const data = await apiRequest(
      `api/notifications/?page=${pageToLoad}`
    );
  
    setNotifications(prev =>
      reset ? data.results : [...prev, ...data.results]
    );
  
    setHasNext(data.has_next);
  
    setPage(pageToLoad + 1);
  };
  
  useEffect(() => {

    let socket: WebSocket | null = null;
  
    connectNotificationSocket().then((ws) => {
  
      if (!ws) return;
  
      socket = ws;
  
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
  
        console.log("LIVE NOTIFICATION:", data);
  
        setNotifications(prev => {
  
          const exists = prev.find(
            n => n.group_key === data.group_key
          );
  
          if (exists) {
            return prev.map(n =>
              n.group_key === data.group_key
                ? {
                    ...n,
                    ...data,
                    read: false
                  }
                : n
            );
          }
  
          return [data, ...prev];
        });
  
        setCount((c: number) => c + 1);
      };
  
    });
  
    return () => {
      if (socket) {
        socket.close();
      }
    };
  
  }, []);
  
  const openNotification = async (notification: any) => {

    if (loadingId === notification.id) return;
  
    setLoadingId(notification.id);
  
    // mark as read instantly
    if (!notification.read) {
  
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read: true }
            : n
        )
      );
  
      setCount(c => Math.max(c - 1, 0));
  
      try {
        await apiRequest(
          `api/notifications/${notification.id}/read/`,
          { method: "POST" }
        );
      } catch (err) {
        console.error(err);
      }
    }
  
    // routing
    try {
  
      if (notification.type === "invite" && notification.community) {
        push(`/main/community/${notification.community}/invitation`);
        return;
      }
  
      if (notification.post) {

        if (notification.post_content_type === "short_video") {
            push(`/main/reels/${notification.post}`);
        } else {
            push(`/main/home/${notification.post}`);
        }
    
        return;
      }

      if (notification.community) {
        push(`/main/community/${notification.community}`);
        return;
      }
  
      const actor = notification.actors?.[0];
  
      if (actor?.username) {
        push(`/main/profile/${actor.username}`);
      }
  
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-2xl text-gray-700 dark:text-gray-200 mt-20 mx-auto p-4">

      <div className="flex justify-between items-center mb-6">
        <div className="relative text-2xl font-bold flex gap-2">
          <Bell /> Notifications
        
          {count > 0 && (
            <span className="absolute -top-1 right-36 bg-red-500 text-white text-xs px-1 rounded-full">
              {count}
            </span>
          )}
        </div>
      </div>

      {notifications.map(n => {
        const actors = n.actors || []
        const mainActor = actors[0]
        
        return (
          <div onClick={() => openNotification(n)}
            key={n.id}
            className={`p-4 rounded-xl mb-2 flex gap-3 items-center transition
            ${!n.read 
              ? "bg-indigo-500 text-white font-semibold shadow-md"
              : "bg-white dark:bg-gray-900"
            }`}
          >
            <div className="flex gap-3">
            {mainActor?.avatar ? (
              <img src={mainActor.avatar} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                {mainActor?.username?.slice(0, 2).toUpperCase() || "??"}
              </div>
            )}
            <div className="flex-1">
              <p>{n.message}</p>
              <p className="text-xs text-gray-400">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            </div>
          </div>
        )
      })}

      {hasNext && (
        <button
          onClick={() => loadNotifications()}
          className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Load more
        </button>
      )}

    </div>
  )
}