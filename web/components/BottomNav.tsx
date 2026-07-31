"use client";

import AppLink from '@/components/AppLink';
import { Home, MessageSquare, Users, User, Video } from "lucide-react";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { apiRequest } from "@/utils/api";
import { NotificationContext } from "@/components/NotificationContext"

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useContext(UserContext) || {};
  const { count, setCount } = useContext(NotificationContext) || {}

  const navItems = [
    { name: "Home", path: "/main/home", icon: Home },
    
    { name: "Communities", path: "/main/tribe", icon: Users },
    { name: "Reels", path: "/main/reels", icon: Video },
  ];
  {/*{ name: "Messages", path: "/main/messages", icon: MessageSquare },*/}

  const profileActive = pathname.startsWith("/main/profile");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 z-40">
      
      {navItems.map(({ name, path, icon: Icon }) => {
        const active = pathname === path;
        return (
          <AppLink
            key={name}
            href={path}
            prefetch={false}
            onClick={async () => {
              if (name === "Notifications") {
                setCount(0);
          
                try {
                  await apiRequest(
                    "api/notifications/read-all/",
                    { method: "POST" }
                  );
                } catch (e) {
                  console.error(e);
                }
              }
            }}
            className="flex flex-col items-center text-xs relative"
          >
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
      {user && (
        <AppLink
          href={`/main/profile/${user.username}`}
          prefetch={false}
          className="flex flex-col items-center text-xs"
        >
          <User
            className={`w-6 h-6 ${
              profileActive ? "text-indigo-600" : "text-gray-500"
            }`}
          />
          <span
            className={
              profileActive ? "text-indigo-600" : "text-gray-500"
            }
          >
            Profile
          </span>
        </AppLink>
      )}
    </nav>
  );
}