"use client";

import AppLink from '@/components/AppLink';
import { Home, MessageSquare, PlusCircle, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { NotificationContext } from "@/components/NotificationContext"

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useContext(UserContext) || {};
  const { count, setCount } = useContext(NotificationContext) || {}

  const navItems = [
    { name: "Home", path: "/main/home", icon: Home },
    { name: "Notifications", path: "/main/notification", icon: Bell },
    { name: "Create", path: "/main/create-post", icon: PlusCircle },
  ];

  const profileActive = pathname.startsWith("/main/profile");
  //{ name: "Messages", path: "/main/messages", icon: MessageSquare },

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 z-40">
      
      {navItems.map(({ name, path, icon: Icon }) => {
        const active = pathname === path;
        return (
          <AppLink key={name} prefetch={false} href={path} className="flex flex-col items-center text-xs relative">
            <Icon className={active ? "text-indigo-600" : "text-gray-500"} />
            {name === "Notifications" && count > 0 && (
              <span className="absolute -top-1 right-4 bg-red-500 text-white text-[10px] px-1 rounded-full">
                {count}
              </span>
            )}
            <span className={active ? "text-indigo-600" : "text-gray-500"}>{name}</span>
          </AppLink>
        );
      })}

      {/* Profile */}
      {user ? (
        <AppLink href={`/main/profile/${user.username}`} prefetch={false} className="flex flex-col items-center text-xs">
          {user.avatar ? (
            <img
              src={user.avatar}
              className={`w-6 h-6 rounded-full border-2 border-gray-400 dark:border-white object-cover ${profileActive ? "ring-2 ring-indigo-600" : ""}`}
            />
          ) : (
            <div
              className={`w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs ${
                profileActive ? "ring-2 ring-indigo-600" : ""
              }`}
            >
              {user.email?.slice(0, 2).toUpperCase() || "??"}
            </div>
          )}
          <span className={profileActive ? "text-indigo-600" : "text-gray-500"}>Profile</span>
        </AppLink>
      ) : (
        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
      )}
    </nav>
  );
}