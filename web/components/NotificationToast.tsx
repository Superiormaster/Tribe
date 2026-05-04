'use client'

import { useContext } from "react";
import { NotificationContext } from "./NotificationContext";

export default function NotificationToast() {
  const { toast, dismissToast } = useContext(NotificationContext);

  if (!toast) return null;

  return (
    <div 
      className="fixed bottom-20 right-4 bg-white dark:bg-gray-800 shadow-lg border border-gray-300 dark:border-gray-700 rounded-xl p-4 w-72 flex gap-3 items-center animate-slide-in"
      onClick={dismissToast}
    >
      <img 
        src={toast.sender.avatar} 
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
        <p className="text-xs text-gray-400">{new Date(toast.created_at).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}