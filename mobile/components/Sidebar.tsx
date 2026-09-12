import { useContext, useEffect, useState } from "react";
import {
Image,
Pressable,
ScrollView,
Text,
View,
} from "react-native";
import { usePathname } from "expo-router";
import { useColorScheme } from "nativewind";

import { useNavigation } from "@/utils/useNavigation";
import AppLink from "@/components/AppLink";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { apiRequest } from "@/utils/api";
import { useAccountSwitcher } from "@/components/AccountSwitcherContext";
import { useInviteSheet } from "@/components/invite/InviteContext";

import {
LayoutDashboard,
Settings,
Moon,
Sun,
Laptop,
X,
Share2,
Users,
Search,
Plus,
Repeat,
Handshake,
ChevronDown,
Bookmark,
Trophy,
Mail,
} from "lucide-react-native";

import { tribe2 } from "@/assets";
import { logout } from "@/utils/auth";
import { UserContext } from "@/components/UserContext";

interface SidebarProps {
closeMenu: () => void;
}

export default function Sidebar({ closeMenu }: SidebarProps) {
const {
isOnline,
latency,
} = useNetwork();

const { openSwitcher } = useAccountSwitcher();
const { push } = useNavigation();
const pathname = usePathname();
const { showInvite } = useInviteSheet();
const { colorScheme, setColorScheme } = useColorScheme();

const context = useContext(UserContext);

const [inviteCount, setInviteCount] = useState(0);
const [invites, setInvites] = useState<any[]>([]);

const [tribes, setTribes] = useState<any[]>([]);
const [tribeOpen, setTribeOpen] = useState(false);

if (!context) return null;

const { user } = context;

const isActive = (path: string) =>
pathname === path || pathname.startsWith("${path}/");

const links = [
{
name: "Dashboard",
path: "/main/dashboard",
icon: LayoutDashboard,
},
];

useEffect(() => {
const loadTribes = async () => {
try {
const data = await apiRequest("api/tribes/");
setTribes(data.results ?? data);
} catch (error) {
console.error("Failed to load tribes:", error);
}
};

loadTribes();

}, []);

useEffect(() => {
const loadInvites = async () => {
try {
const data = await apiRequest("api/communities/invites/");

    const list = Array.isArray(data)
      ? data
      : data.results ?? [];

    setInvites(list);
    setInviteCount(list.length);
  } catch (error) {
    console.error("Failed to load invitations:", error);
  }
};

loadInvites();

}, []);

const navItem =
"flex-row items-center gap-3 rounded-lg px-4 py-3";

const activeNavItem =
"bg-indigo-600";

const handleNavigation = (path: string) => {
closeMenu();
push(path);
};

return (
<View className="flex-1 bg-white dark:bg-gray-950">
{/* Header */}
<View className="h-16 shrink-0 flex-row items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
<View className="flex-row items-center gap-3">
<View className="h-14 w-14 overflow-hidden rounded-full">
<Image
source={tribe2}
accessibilityLabel="Tribe Logo"
resizeMode="cover"
className="h-full w-full"
/>
</View>

      <Text className="font-bold text-gray-900 dark:text-gray-100">
        {user?.username}
      </Text>
    </View>

    <Pressable
      onPress={closeMenu}
      className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-200 dark:active:bg-zinc-800"
    >
      <X
        size={20}
        color={colorScheme === "dark" ? "#f3f4f6" : "#111827"}
      />
    </Pressable>
  </View>

  {/* Connection Status */}
  {!isOnline ? (
    <View className="mx-4 mb-2 mt-4 rounded-lg bg-red-400 px-3 py-2 dark:bg-red-900/20">
      <Text className="text-sm text-white">
        ⚫ Offline
      </Text>
    </View>
  ) : (
    <View className="mx-4 mb-2 mt-4 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
      <Text className="text-sm text-gray-900 dark:text-gray-100">
        🟢 Online {Math.round(latency ?? 0)} ms
      </Text>
    </View>
  )}

  {/* Navigation */}
  <ScrollView
    className="flex-1"
    contentContainerClassName="p-4 pb-14"
    showsVerticalScrollIndicator={false}
  >
    <View className="gap-2">
      {/* Search */}
      <AppLink
        prefetch={false}
        onClick={closeMenu}
        className={`${navItem} ${
          isActive("/main/search")
            ? activeNavItem
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
        href="/main/search"
      >
        <Search
          size={20}
          color={
            isActive("/main/search")
              ? "#ffffff"
              : colorScheme === "dark"
                ? "#f3f4f6"
                : "#111827"
          }
        />

        <Text
          className={
            isActive("/main/search")
              ? "text-white"
              : "text-gray-900 dark:text-gray-100"
          }
        >
          Search
        </Text>
      </AppLink>

      {/* Bookmarks */}
      <AppLink
        prefetch={false}
        onClick={closeMenu}
        className={`${navItem} ${
          isActive("/main/bookmarks")
            ? activeNavItem
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
        href="/main/bookmarks"
      >
        <Bookmark
          size={20}
          color={
            isActive("/main/bookmarks")
              ? "#ffffff"
              : colorScheme === "dark"
                ? "#f3f4f6"
                : "#111827"
          }
        />

        <Text
          className={
            isActive("/main/bookmarks")
              ? "text-white"
              : "text-gray-900 dark:text-gray-100"
          }
        >
          Bookmarks
        </Text>
      </AppLink>

      {/* Switch Account */}
      <View
        className={`flex-row items-center justify-between rounded-lg px-4 py-3 ${
          isActive("/main/switch-account")
            ? activeNavItem
            : ""
        }`}
      >
        <AppLink
          className="flex-1 flex-row items-center gap-3"
          prefetch={false}
          onClick={closeMenu}
          href="/main/switch-account"
        >
          <Repeat
            size={20}
            color={
              isActive("/main/switch-account")
                ? "#ffffff"
                : colorScheme === "dark"
                  ? "#f3f4f6"
                  : "#111827"
            }
          />

          <Text
            className={
              isActive("/main/switch-account")
                ? "text-white"
                : "text-gray-900 dark:text-gray-100"
            }
          >
            Switch Account
          </Text>
        </AppLink>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            closeMenu();
            openSwitcher();
          }}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-gray-300 dark:active:bg-zinc-700"
        >
          <ChevronDown
            size={18}
            color={
              colorScheme === "dark"
                ? "#f3f4f6"
                : "#111827"
            }
          />
        </Pressable>
      </View>

      {/* Main Links */}
      {links.map(({ name, path, icon: Icon }) => {
        const active = isActive(path);

        return (
          <AppLink
            key={name}
            href={path}
            prefetch={false}
            onClick={closeMenu}
            className={`relative ${navItem} ${
              active
                ? activeNavItem
                : "active:bg-gray-200 dark:active:bg-zinc-800"
            }`}
          >
            {active && (
              <View className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-white" />
            )}

            <Icon
              size={20}
              color={
                active
                  ? "#ffffff"
                  : colorScheme === "dark"
                    ? "#f3f4f6"
                    : "#111827"
              }
            />

            <Text
              className={
                active
                  ? "text-white"
                  : "text-gray-900 dark:text-gray-100"
              }
            >
              {name}
            </Text>
          </AppLink>
        );
      })}

      {/* Settings */}
      <AppLink
        href="/main/settings"
        prefetch={false}
        onClick={closeMenu}
        className={`${navItem} ${
          isActive("/main/settings")
            ? activeNavItem
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
      >
        <Settings
          size={20}
          color={
            isActive("/main/settings")
              ? "#ffffff"
              : colorScheme === "dark"
                ? "#f3f4f6"
                : "#111827"
          }
        />

        <Text
          className={
            isActive("/main/settings")
              ? "text-white"
              : "text-gray-900 dark:text-gray-100"
          }
        >
          Settings
        </Text>
      </AppLink>

      {/* Live Sports */}
      <AppLink
        href="/sports"
        prefetch={false}
        onClick={closeMenu}
        className={`${navItem} ${
          isActive("/sports")
            ? activeNavItem
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
      >
        <Trophy
          size={20}
          color={
            isActive("/sports")
              ? "#ffffff"
              : colorScheme === "dark"
                ? "#f3f4f6"
                : "#111827"
          }
        />

        <Text
          className={
            isActive("/sports")
              ? "text-white"
              : "text-gray-900 dark:text-gray-100"
          }
        >
          Live Sports
        </Text>
      </AppLink>

      {/* Tribe Dropdown */}
      <Pressable
        onPress={() => setTribeOpen((prev) => !prev)}
        className={`relative ${navItem} ${
          pathname.startsWith("/main/tribe/")
            ? activeNavItem
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
      >
        {pathname.startsWith("/main/tribe/") && (
          <View className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-white" />
        )}

        <Users
          size={20}
          color={
            pathname.startsWith("/main/tribe/")
              ? "#ffffff"
              : colorScheme === "dark"
                ? "#f3f4f6"
                : "#111827"
          }
        />

        <Text
          className={
            pathname.startsWith("/main/tribe/")
              ? "text-white"
              : "text-gray-900 dark:text-gray-100"
          }
        >
          Tribe
        </Text>

        <View className="ml-auto">
          <ChevronDown
            size={18}
            color={
              pathname.startsWith("/main/tribe/")
                ? "#ffffff"
                : colorScheme === "dark"
                  ? "#f3f4f6"
                  : "#111827"
            }
          />
        </View>
      </Pressable>

      {tribeOpen && (
        <View className="ml-6 gap-1">
          {/* Request Tribe */}
          <View className="rounded-lg">
            <AppLink
              className="flex-row items-center rounded-lg px-4 py-2 active:bg-gray-200 dark:active:bg-zinc-800"
              href="/main/tribe_request"
              prefetch={false}
              onClick={closeMenu}
            >
              <Plus
                size={18}
                color={
                  colorScheme === "dark"
                    ? "#f3f4f6"
                    : "#111827"
                }
              />

              <Text className="ml-1 text-gray-900 dark:text-gray-100">
                Request a Tribe
              </Text>
            </AppLink>
          </View>

          <View className="my-2 h-px bg-gray-300 dark:bg-zinc-700" />

          {/* Tribes */}
          {tribes.map((tribe) => (
            <Pressable
              key={tribe.id}
              onPress={() => {
                closeMenu();
                push(`/main/tribe/${tribe.id}`);
              }}
              className="rounded-lg px-4 py-2 active:bg-gray-200 dark:active:bg-zinc-800"
            >
              <Text className="text-gray-900 dark:text-gray-100">
                {tribe.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Connections */}
      <AppLink
        prefetch={false}
        className={`${navItem} ${
          isActive("/main/requests")
            ? activeNavItem
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
        onClick={closeMenu}
        href="/main/requests"
      >
        <Handshake
          size={20}
          color={
            isActive("/main/requests")
              ? "#ffffff"
              : colorScheme === "dark"
                ? "#f3f4f6"
                : "#111827"
          }
        />

        <Text
          className={
            isActive("/main/requests")
              ? "text-white"
              : "text-gray-900 dark:text-gray-100"
          }
        >
          Connections
        </Text>
      </AppLink>

      {/* Invitations */}
      <AppLink
        className={`relative ${navItem} ${
          isActive("/main/invitation")
            ? activeNavItem
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
        prefetch={false}
        onClick={closeMenu}
        href="/main/invitation"
      >
        <Mail
          size={20}
          color={
            isActive("/main/invitation")
              ? "#ffffff"
              : colorScheme === "dark"
                ? "#f3f4f6"
                : "#111827"
          }
        />

        <Text
          className={
            isActive("/main/invitation")
              ? "text-white"
              : "text-gray-900 dark:text-gray-100"
          }
        >
          Invitations
        </Text>

        {inviteCount > 0 && (
          <View className="absolute left-2 top-2 min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1">
            <Text className="text-[10px] text-white">
              {inviteCount > 9 ? "9+" : inviteCount}
            </Text>
          </View>
        )}
      </AppLink>

      {/* Invite Friends */}
      <Pressable
        onPress={() => {
          closeMenu();
          showInvite();
        }}
        className={`${navItem} active:bg-gray-200 dark:active:bg-zinc-800`}
      >
        <Share2
          size={20}
          color={
            colorScheme === "dark"
              ? "#f3f4f6"
              : "#111827"
          }
        />

        <Text className="text-gray-900 dark:text-gray-100">
          Invite Friends
        </Text>
      </Pressable>
    </View>

    {/* Appearance */}
    <View className="mt-6 gap-2 border-t border-gray-200 pb-14 pt-6 dark:border-gray-800">
      <Text className="px-2 text-xs uppercase text-gray-500 dark:text-gray-400">
        Appearance
      </Text>

      {/* System */}
      <Pressable
        onPress={() => setColorScheme("system")}
        className={`flex-row items-center gap-3 rounded-lg px-4 py-2 ${
          colorScheme === "system"
            ? "bg-gray-200 dark:bg-zinc-800"
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
      >
        <Laptop
          size={18}
          color={
            colorScheme === "dark"
              ? "#f3f4f6"
              : "#111827"
          }
        />

        <Text className="text-gray-900 dark:text-gray-100">
          System
        </Text>
      </Pressable>

      {/* Light */}
      <Pressable
        onPress={() => setColorScheme("light")}
        className={`flex-row items-center gap-3 rounded-lg px-4 py-2 ${
          colorScheme === "light"
            ? "bg-gray-200 dark:bg-zinc-800"
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
      >
        <Sun
          size={18}
          color={
            colorScheme === "dark"
              ? "#f3f4f6"
              : "#111827"
          }
        />

        <Text className="text-gray-900 dark:text-gray-100">
          Light
        </Text>
      </Pressable>

      {/* Dark */}
      <Pressable
        onPress={() => setColorScheme("dark")}
        className={`flex-row items-center gap-3 rounded-lg px-4 py-2 ${
          colorScheme === "dark"
            ? "bg-gray-200 dark:bg-zinc-800"
            : "active:bg-gray-200 dark:active:bg-zinc-800"
        }`}
      >
        <Moon
          size={18}
          color={
            colorScheme === "dark"
              ? "#f3f4f6"
              : "#111827"
          }
        />

        <Text className="text-gray-900 dark:text-gray-100">
          Dark
        </Text>
      </Pressable>

      {/* Logout */}
      <Pressable
        onPress={() => {
          closeMenu();
          logout();
        }}
        className="rounded-lg px-4 py-2 active:bg-red-900/30"
      >
        <Text className="text-red-400">
          Logout
        </Text>
      </Pressable>
    </View>
  </ScrollView>
</View>

);
}