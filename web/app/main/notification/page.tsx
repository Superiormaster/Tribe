'use client'

import { useEffect, useState } from 'react'
import Link from "next/link";
import { useContext } from "react"
import { apiRequest } from '@/utils/api'
import { Bell } from 'lucide-react'
import { NotificationContext } from "@/components/NotificationContext"
import { notificationSocket } from "@/lib/socket";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const { count, setCount } = useContext(NotificationContext)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    if (!hasNext) return

    const data = await apiRequest(`api/notifications/?page=${page}`)

    setNotifications(prev => [...prev, ...data.results])
    setHasNext(data.has_next)
    setPage(prev => prev + 1)
  }

  useEffect(()=>{
    apiRequest("api/notifications/?page=1").then(data=>{
      const unread = data.results.filter((n:any)=>!n.read).length
      setCount(unread)
    })
  },[])

  useEffect(() => {
    const socket = notificationSocket();
  
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
  
      console.log("NOTIFICATION:", data);
  
      // update bell / UI
    };
  
    return () => socket.close();
  }, []);

  const markAllRead = async () => {
    await apiRequest("api/notifications/read-all/", { method: "POST" })
    setNotifications(n => n.map(x => ({ ...x, read: true })))
    setCount(0)
  }

  return (
    <div className="max-w-2xl text-gray-700 dark:text-gray-200 mx-auto p-4">

      <div className="flex justify-between items-center mb-6">
        <div className="relative text-2xl font-bold flex gap-2">
          <Bell /> Notifications
        
          {count > 0 && (
            <span className="absolute -top-1 right-36 bg-red-500 text-white text-xs px-1 rounded-full">
              {count}
            </span>
          )}
        </div>

        <button
          onClick={markAllRead}
          className="text-sm text-indigo-600"
        >
          Mark all as read
        </button>
      </div>

      {notifications.map(n => {
        const actor = n.actors?.[0] // safely access first actor
        const profileLink = actor
          ? `/profile/${actor.username}`
          : "/profile/unknown" // fallback if no actor

        const postLink = n.post ? `/post/${n.post.id}` : profileLink
        
        return (
          <Link
            key={n.id}
            href={postLink}
            className={`p-4 rounded-xl mb-2 flex gap-3 items-center ${
              !n.read ? "bg-indigo-400 text-white" : "bg-white dark:bg-gray-900"
            }`}
          >
            <div className="flex gap-3">
            {actor?.avatar ? (
              <img src={actor.avatar} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                {actor?.email?.slice(0, 2).toUpperCase() || "??"}
              </div>
            )}
            <div className="flex-1">
              <p>{n.message}</p>
              <p className="text-xs text-gray-400">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            </div>
          </Link>
        )
      })}

      {hasNext && (
        <button
          onClick={loadNotifications}
          className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Load more
        </button>
      )}

    </div>
  )
}