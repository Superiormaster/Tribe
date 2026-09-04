"use client";

import { useEffect, useState, useContext, useRef } from "react";
import { apiRequest } from "@/utils/api";
import {
  Bell,
  Ban,
  Unlock,
  Heart,
  MessageCircle,
  Reply,
  Star,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Bookmark,
  Share2,
  Repeat2,
  UserPlus,
  UserCheck,
  Users,
  Check,
} from "lucide-react";

import {
  getNotificationPageOpened,
  setNotificationPageOpened,
} from "@/lib/notificationdb";
import { NotificationContext } from "@/components/NotificationContext";
import { useNavigation } from "@/utils/useNavigation";

export default function NotificationsPage() {
  const { push } = useNavigation();

  const {
    count,
    setCount,
    refreshNotificationCount,
  } = useContext(NotificationContext);

  const [notifications, setNotifications] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);

  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const notificationIcons = {
    like: Heart,
    comment_like: Heart,
    comment: MessageCircle,
    reply: Reply,
    star: Star,
    bookmark: Bookmark,
    share: Share2,
    repost: Repeat2,

    connection_request: UserPlus,
    connection_accept: UserCheck,

    invite: UserPlus,
    invite_accept: UserCheck,

    join_request: Users,
    join_approved: CheckCircle,
    join_rejected: XCircle,

    community_ban: Ban,
    community_unban: Unlock,

    moderator_added: ShieldCheck,
    admin_added: ShieldCheck,
  };

  const notificationIconColors = {
    like: "text-red-500",
    comment_like: "text-red-500",
    comment: "text-blue-500",
    reply: "text-blue-500",
    star: "text-yellow-500",
    bookmark: "text-amber-500",
    share: "text-green-500",
    repost: "text-purple-500",

    connection_request: "text-blue-500",
    connection_accept: "text-green-500",

    invite: "text-blue-500",
    invite_accept: "text-green-500",

    join_request: "text-blue-500",
    join_approved: "text-green-500",
    join_rejected: "text-red-500",

    community_ban: "text-red-500",
    community_unban: "text-green-500",

    moderator_added: "text-indigo-500",
    admin_added: "text-indigo-500",

    unknown: "text-gray-500",
  };

  const loadNotifications = async (
    pageNumber: number,
    append = false
  ) => {
    setLoading(true);
  
    try {
      const data = await apiRequest(
        `api/notifications/?page=${pageNumber}`
      );
  
      const results = data.results ?? [];
  
      setNotifications((prev) =>
        append
          ? [...prev, ...results]
          : results
      );
  
      setHasNext(
        Boolean(data.has_next)
      );
  
      setPage(pageNumber + 1);
  
    } catch (error) {
      console.error(
        "[Notifications] Failed to load notifications:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
  
    const initialize = async () => {
      try {
        setLoading(true);
  
        const data = await apiRequest(
          "api/notifications/?page=1"
        );
  
        if (cancelled) return;
  
        const results =
          data.results ?? [];
  
        setNotifications(results);
  
        setHasNext(
          Boolean(data.has_next)
        );
  
        setPage(2);
  
        const opened =
          await getNotificationPageOpened();
  
        if (cancelled) return;
  
        if (opened) {
          // SECOND VISIT
          await apiRequest(
            "api/notifications/read-all/",
            {
              method: "POST",
            }
          );
  
          if (cancelled) return;
  
          setNotifications((prev) =>
            prev.map((n) => ({
              ...n,
              read: true,
            }))
          );
  
          setCount(0);
  
          await setNotificationPageOpened(
            false
          );
        } else {
          // FIRST VISIT
          await setNotificationPageOpened(
            true
          );
        }
      } catch (error) {
        console.error(
          "[Notifications] Initialization failed:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
  
    initialize();
  
    return () => {
      cancelled = true;
    };
  }, [setCount]);

  const markAllAsRead = async () => {
    if (markingAll) return;

    setMarkingAll(true);

    try {
      await apiRequest(
        "api/notifications/read-all/",
        {
          method: "POST",
        }
      );

      // Update page immediately
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      // Update global Navbar count
      setCount(0);

    } catch (error) {
      console.error(
        "[Notifications] Failed to mark all as read:",
        error
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const markAsRead = async (notification: any) => {
    if (notification.read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? {
              ...n,
              read: true,
            }
          : n
      )
    );

    setCount((current) =>
      Math.max(current - 1, 0)
    );

    try {
      await apiRequest(
        `api/notifications/${notification.id}/read/`,
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error(
        "[Notifications] Failed to mark notification as read:",
        error
      );

      // Revert if API failed
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? {
                ...n,
                read: false,
              }
            : n
        )
      );

      setCount((current) => current + 1);
    }
  };

  const openNotification = async (
    notification: any
  ) => {
    if (loadingId === notification.id) return;

    setLoadingId(notification.id);

    await markAsRead(notification);

    try {
      if (
        notification.type === "invite" &&
        notification.community
      ) {
        push(
          `/main/community/${notification.community}/invitation`
        );

        return;
      }

      if (notification.post) {
        if (
          notification.post_content_type ===
          "short_video"
        ) {
          push(
            `/main/reels/${notification.post}`
          );
        } else {
          push(
            `/main/home/${notification.post}`
          );
        }

        return;
      }

      if (notification.community) {
        push(
          `/main/community/${notification.community}`
        );

        return;
      }

      const actor =
        notification.actors?.[0];

      if (actor?.username) {
        push(
          `/main/profile/${actor.username}`
        );
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-2xl text-gray-700 dark:text-gray-200 mt-20 mx-auto p-4">

      {/* HEADER */}

      <div className="flex items-center justify-between mb-6">

        <div className="relative flex items-center gap-2 text-2xl font-bold">
          <Bell />

          <span>
            Notifications
          </span>

          {count > 0 && (
            <span className="absolute -top-1 right-36 bg-red-500 text-white text-xs px-1 rounded-full">
              {count}
            </span>
          )}
        </div>

        {notifications.some(
          (notification) => !notification.read
        ) && (
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={markingAll}
            className="
              flex
              items-center
              gap-2
              px-3
              py-2
              rounded-lg
              bg-indigo-600
              hover:bg-indigo-700
              text-white
              text-sm
              font-medium
              disabled:opacity-50
              transition
            "
          >
            <Check size={16} />
          </button>
        )}

      </div>

      {/* NOTIFICATIONS */}

      {notifications.length === 0 && !loading ? (
        <div className="py-16 text-center text-gray-500">
          <Bell
            size={40}
            className="mx-auto mb-3 opacity-40"
          />

          <p>
            No notifications yet.
          </p>
        </div>
      ) : (
        notifications.map((n) => {
          const actors = n.actors || [];
          const mainActor = actors[0];

          const Icon =
            notificationIcons[
              n.type as keyof typeof notificationIcons
            ] ?? Bell;

          const iconColor =
            notificationIconColors[
              n.type as keyof typeof notificationIconColors
            ] ?? "text-gray-300";

          return (
            <div
              onClick={() =>
                openNotification(n)
              }
              key={n.id}
              className={`
                p-4
                rounded-xl
                mb-2
                flex
                gap-3
                items-center
                transition
                cursor-pointer

                ${
                  !n.read
                    ? "bg-indigo-300 dark:bg-indigo-600 text-gray-800 dark:text-white font-semibold shadow-md"
                    : "bg-white dark:bg-gray-900"
                }

                hover:opacity-90
              `}
            >

              {/* Avatar */}

              <div className="relative shrink-0">

                {mainActor?.avatar ? (
                  <img
                    src={mainActor.avatar}
                    className="w-10 h-10 rounded-full object-cover"
                    alt={
                      mainActor.username ||
                      "User"
                    }
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                    {mainActor?.username
                      ?.slice(0, 2)
                      .toUpperCase() ||
                      "??"}
                  </div>
                )}

                {/* Notification type */}

                <div
                  className={`
                    absolute
                    -right-1
                    -bottom-1
                    w-6
                    h-6
                    rounded-full
                    flex
                    items-center
                    justify-center
                    border-2

                    ${
                      !n.read
                        ? "bg-indigo-500 border-indigo-500"
                        : "bg-white dark:bg-gray-900 border-white dark:border-gray-900"
                    }
                  `}
                >
                  <Icon
                    size={14}
                    strokeWidth={2.5}
                    className={iconColor}
                  />
                </div>

              </div>

              {/* Content */}

              <div className="flex-1 min-w-0">

                <p>
                  {n.message}
                </p>

                <p
                  className={`
                    text-xs mt-1

                    ${
                      !n.read
                        ? "text-gray-600 dark:text-white/70"
                        : "text-gray-400"
                    }
                  `}
                >
                  {new Date(
                    n.created_at
                  ).toLocaleString()}
                </p>

              </div>

            </div>
          );
        })
      )}

      {/* LOAD MORE */}

      {hasNext && (
        <button
          type="button"
          onClick={() =>
            loadNotifications(page, true)
          }
          disabled={loading}
          className="
            w-full
            mt-4
            py-2
            bg-indigo-600
            hover:bg-indigo-700
            text-white
            rounded-lg
            disabled:opacity-50
          "
        >
          {loading
            ? "Loading..."
            : "Load more"}
        </button>
      )}

    </div>
  );
}