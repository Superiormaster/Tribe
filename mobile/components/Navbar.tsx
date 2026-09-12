import {
  useContext,
  useState,
} from "react";

import {
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  Bell,
  Home,
  Menu,
  MessageSquare,
  X,
} from "lucide-react-native";

import { usePathname } from "expo-router";

import AppLink from "@/components/AppLink";
import { tribe2 } from "@/assets";

import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { UserContext } from "@/components/UserContext";
import { NotificationContext } from "@/components/NotificationContext";
import Sidebar from "./Sidebar";
import { apiRequest } from "@/utils/api";

export default function Navbar() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const { user } =
    useContext(UserContext) || {};

  const {
    count,
    setCount,
  } =
    useContext(NotificationContext) || {};

  const { latency } = useNetwork();

  const profileActive =
    pathname.startsWith("/main/profile");

  /*
   * ---------------------------------------------------------
   * NAVIGATION ITEMS
   * ---------------------------------------------------------
   */

  const navItems = [
    {
      name: "Home",
      path: "/main/home",
      icon: Home,
    },
    {
      name: "Notification",
      path: "/main/notification",
      icon: Bell,
    },
    {
      name: "Messages",
      path: "/main/messages",
      icon: MessageSquare,
    },
  ];

  const mobileNavItems = [
    {
      name: "Notification",
      path: "/main/notification",
      icon: Bell,
    },
  ];

  /*
   * ---------------------------------------------------------
   * NOTIFICATION READ
   * ---------------------------------------------------------
   */

  const handleNotificationPress =
    async () => {
      setCount?.(0);

      try {
        await apiRequest(
          "api/notifications/read-all/",
          {
            method: "POST",
          }
        );
      } catch (error) {
        console.error(
          error
        );
      }
    };

  /*
   * ---------------------------------------------------------
   * PROFILE
   * ---------------------------------------------------------
   */

  const renderProfile = (
    size: number,
    showLabel = true
  ) => {
    if (!user) {
      return (
        <View
          className={`items-center justify-center rounded-full bg-gray-200 ${
            size === 40
              ? "h-10 w-10"
              : "h-6 w-6"
          }`}
        />
      );
    }

    return (
      <View className="items-center">
        <View
          className={`overflow-hidden rounded-full border-2 border-gray-400 dark:border-white ${
            size === 40
              ? "h-10 w-10"
              : "h-6 w-6"
          } ${
            profileActive
              ? "border-indigo-600"
              : ""
          }`}
        >
          {user.avatar ? (
            <Image
              source={{
                uri: user.avatar,
              }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-gray-400">
              <Text className="text-xs text-white">
                {user.email
                  ?.slice(0, 2)
                  .toUpperCase() ||
                  "??"}
              </Text>
            </View>
          )}
        </View>

        {showLabel && (
          <Text
            className={`mt-1 text-xs ${
              profileActive
                ? "text-indigo-600"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Profile
          </Text>
        )}
      </View>
    );
  };

  return (
    <>
      {/* =====================================================
          NAVBAR
          ===================================================== */}

      <View className="absolute left-0 right-0 top-0 z-40 h-16 flex-row items-center justify-between bg-white px-2 shadow-md dark:bg-gray-900">
        {/* MENU */}
        <Pressable
          onPress={() =>
            setMenuOpen(true)
          }
          className="rounded-lg p-2"
          hitSlop={8}
        >
          <Menu
            size={24}
            color="#374151"
          />
        </Pressable>

        {/* LOGO */}
        <View className="h-14 w-20 items-center justify-center overflow-hidden">
          <Image
            source={tribe2}
            className="h-14 w-20"
            resizeMode="contain"
          />
        </View>

        {/* =================================================
            CENTER NAVIGATION
            ================================================= */}

        <View className="hidden flex-row items-center gap-3">
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
                  className="relative items-center rounded-lg p-2"
                  onPress={
                    name ===
                    "Notification"
                      ? handleNotificationPress
                      : undefined
                  }
                >
                  <Icon
                    size={22}
                    color={
                      active
                        ? "#4f46e5"
                        : "#6b7280"
                    }
                  />

                  {name ===
                    "Notification" &&
                    Number(count || 0) >
                      0 && (
                      <View className="absolute -right-1 -top-1 min-w-[16px] items-center rounded-full bg-red-500 px-1">
                        <Text className="text-[10px] font-bold text-white">
                          {Number(count) >
                          9
                            ? "9+"
                            : count}
                        </Text>
                      </View>
                    )}

                  <Text
                    className={`mt-1 text-[10px] ${
                      active
                        ? "text-indigo-600"
                        : "text-gray-500 dark:text-gray-300"
                    }`}
                  >
                    {name}
                  </Text>
                </AppLink>
              );
            }
          )}

          {/* PROFILE */}
          {user ? (
            <AppLink
              href={`/main/profile/${user.username}`}
              className="items-center"
            >
              {renderProfile(
                24,
                true
              )}
            </AppLink>
          ) : (
            renderProfile(
              24,
              false
            )
          )}

          {/* CONNECTION STATUS */}
          <View className="rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
            <Text className="text-sm text-gray-700 dark:text-gray-200">
              🟢{" "}
              {Math.round(
                latency ?? 0
              )}{" "}
              ms
            </Text>
          </View>
        </View>

        {/* =================================================
            MOBILE RIGHT SIDE
            ================================================= */}

        <View className="flex-row items-center gap-3">
          {mobileNavItems.map(
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
                  onPress={
                    name ===
                    "Notification"
                      ? handleNotificationPress
                      : undefined
                  }
                  className="relative h-10 w-10 items-center justify-center rounded-full bg-gray-100 shadow-sm dark:bg-gray-800"
                >
                  <Icon
                    size={22}
                    color={
                      active
                        ? "#4f46e5"
                        : "#374151"
                    }
                  />

                  {name ===
                    "Notification" &&
                    Number(count || 0) >
                      0 && (
                      <View className="absolute -right-1 -top-1 min-w-[16px] items-center rounded-full bg-red-500 px-1">
                        <Text className="text-[10px] font-bold text-white">
                          {Number(count) >
                          9
                            ? "9+"
                            : count}
                        </Text>
                      </View>
                    )}
                </AppLink>
              );
            }
          )}

          {/* PROFILE */}
          {user ? (
            <AppLink
              href={`/main/profile/${user.username}`}
            >
              {renderProfile(
                40,
                false
              )}
            </AppLink>
          ) : (
            renderProfile(
              40,
              false
            )
          )}
        </View>
      </View>

      {/* =====================================================
          SIDEBAR DRAWER
          ===================================================== */}

      {menuOpen && (
        <View className="absolute inset-0 z-50 flex-1">
          {/* BACKDROP */}
          <Pressable
            onPress={() =>
              setMenuOpen(false)
            }
            className="absolute inset-0 bg-black/40"
          />

          {/* DRAWER */}
          <View className="absolute bottom-0 left-0 top-0 w-[288px] bg-white shadow-xl dark:bg-gray-900">
            {/* CLOSE BUTTON */}
            <View className="absolute right-2 top-2 z-10">
              <Pressable
                onPress={() =>
                  setMenuOpen(false)
                }
                className="rounded-full p-2"
              >
                <X
                  size={22}
                  color="#6b7280"
                />
              </Pressable>
            </View>

            <Sidebar
              closeMenu={() =>
                setMenuOpen(false)
              }
            />
          </View>
        </View>
      )}
    </>
  );
}