"use client";

import AppLink from "@/components/AppLink";
import {
  Home,
  MessageSquare,
  Users,
  User,
  Video,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useContext,
  useEffect,
  useState,
} from "react";
import { UserContext } from "@/components/UserContext";
import { apiRequest } from "@/utils/api";

export default function BottomNav() {
  const pathname = usePathname();

  const { user } =
    useContext(UserContext) || {};

  const [messageCount, setMessageCount] =
    useState(0);

  const navItems = [
    {
      name: "Home",
      path: "/main/home",
      icon: Home,
    },
    {
      name: "Messages",
      path: "/main/messages",
      icon: MessageSquare,
    },
    {
      name: "Communities",
      path: "/main/tribe",
      icon: Users,
    },
    {
      name: "Reels",
      path: "/main/reels",
      icon: Video,
    },
  ];

  const profileActive =
    pathname.startsWith("/main/profile");

  const loadMessageCount = async () => {
    if (!user?.id) return;

    try {
      const data = await apiRequest(
        "api/chats/unread-count/"
      );

      setMessageCount(
        Number(data?.count ?? 0)
      );
    } catch (error) {
      console.error(
        "Failed to load unread message count:",
        error
      );
    }
  };

  useEffect(() => {
    loadMessageCount();
  }, [user?.id]);

  useEffect(() => {
    const handleUnreadUpdate = () => {
      loadMessageCount();
    };

    window.addEventListener(
      "chat-unread-update",
      handleUnreadUpdate
    );

    return () => {
      window.removeEventListener(
        "chat-unread-update",
        handleUnreadUpdate
      );
    };
  }, [user?.id]);

  return (
    <nav className="
      md:hidden
      fixed
      bottom-0
      left-0
      right-0
      bg-white
      dark:bg-gray-900
      border-t
      border-gray-200
      dark:border-gray-700
      flex
      justify-around
      items-center
      h-16
      z-40
    ">

      {navItems.map(
        ({
          name,
          path,
          icon: Icon,
        }) => {
          const active =
            pathname === path;

          return (
            <AppLink
              key={name}
              href={path}
              prefetch={false}
              className="
                flex
                flex-col
                items-center
                text-xs
                relative
              "
            >
              <Icon
                className={
                  active
                    ? "text-indigo-600"
                    : "text-gray-500"
                }
              />

              {name === "Messages" &&
                messageCount > 0 && (
                  <span className="
                    absolute
                    -top-1
                    right-1
                    min-w-5
                    h-5
                    px-1
                    flex
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                    text-white
                    text-[10px]
                    font-semibold
                  ">
                    {messageCount > 99
                      ? "99+"
                      : messageCount}
                  </span>
                )}

              <span
                className={
                  active
                    ? "text-indigo-600"
                    : "text-gray-500"
                }
              >
                {name}
              </span>
            </AppLink>
          );
        }
      )}

      {/* Profile */}
      {user && (
        <AppLink
          href={`/main/profile/${user.username}`}
          prefetch={false}
          className="
            flex
            flex-col
            items-center
            text-xs
          "
        >
          <User
            className={`
              w-6
              h-6
              ${
                profileActive
                  ? "text-indigo-600"
                  : "text-gray-500"
              }
            `}
          />

          <span
            className={
              profileActive
                ? "text-indigo-600"
                : "text-gray-500"
            }
          >
            Profile
          </span>
        </AppLink>
      )}
    </nav>
  );
}