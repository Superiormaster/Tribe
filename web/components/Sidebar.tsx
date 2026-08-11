"use client";

import { useContext, useState, useEffect } from "react";
import { useNavigation } from "@/utils/useNavigation"
import AppLink from '@/components/AppLink';
import { usePathname } from "next/navigation";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { apiRequest } from '@/utils/api';
import { useTheme } from "next-themes";
import Image from "next/image";
import { useAccountSwitcher } from "@/components/AccountSwitcherContext";
import { useInviteSheet } from "@/components/invite/InviteContext";

import {
  LayoutDashboard,
  FolderKanban,
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
  Mail
} from "lucide-react";

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
  const { push, replace } = useNavigation();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { showInvite } = useInviteSheet();
  const context = useContext(UserContext);
  const [inviteCount, setInviteCount] = useState(0);
  const [invites, setInvites] = useState<any[]>([]);

  const [tribes, setTribes] = useState<any[]>([]);
  const [tribeOpen, setTribeOpen] = useState(false);

  if (!context) return null;
  const { user } = context; 

  const links = [
    { name: "Dashboard", path: "/main/analytics", icon: LayoutDashboard },
  ];
  
  useEffect(() => {
    const loadTribes = async () => {
      const data = await apiRequest('api/tribes/');
      setTribes(data.results ?? data);
    };
  
    loadTribes();
  }, []);
  
  useEffect(() => {
    const loadInvites = async () => {
      const data = await apiRequest("api/communities/invites/");
    
      const list = Array.isArray(data) ? data : (data.results ?? []);
    
      setInvites(list);
      setInviteCount(list.length);
    };
  
    loadInvites();
  }, []);

  const navItem =
    "flex items-center gap-3 px-4 py-3 rounded-lg transition cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800";

  return (
    <aside className="flex flex-col h-screen text-gray-900 dark:text-gray-100">

      {/* Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-gray-200 dark:border-gray-800 shrink-0">

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden">
            <Image src={tribe2} alt="logo" />
          </div>
          <span className="font-bold">{user?.username}</span>
        </div>

        <button onClick={closeMenu}>
          <X size={20} />
        </button>

      </div>

      {/* Connection Status */}
      {!isOnline ? (
        <div className="mx-4 mt-4 mb-2 rounded-lg text-white bg-red-400 dark:bg-red-900/20 px-3 py-2 text-sm">
          ⚫ Offline
        </div>
      ) : (
        <div className="mx-4 mt-4 mb-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm">
          🟢 Online {Math.round(latency ?? 0)} ms
        </div>
      )}

      {/* Navigation */}
      <nav className="overflow-y-auto space-y-6 flex-1 p-4">

        <ul className="space-y-2">
          {/* Search Button */}
          <AppLink prefetch={false} onClick={closeMenu} className={navItem} href={"/main/search"}>
            <Search size={20} />
            <span>Search</span>
          </AppLink>

          {/* Switch Account */}
          <li className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800">
  
            {/* LEFT: Navigate to full page */}
            <AppLink
              className="flex items-center gap-3 flex-1 cursor-pointer"
              prefetch={false}
              onClick={closeMenu}
              href={"/main/switch-account"}
            >
              <Repeat size={20} />
              <span>Switch Account</span>
            </AppLink>
          
            {/* RIGHT: Open modal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
                openSwitcher();
              }}
              className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-zinc-700"
            >
              <ChevronDown size={18} />
            </button>
          </li>

          {/*{links.map(({ name, path, icon: Icon }) => {

            const active = pathname === path;

            return (
              <AppLink key={name} href={path} prefetch={false} onClick={closeMenu}>
                <li className={`${navItem} ${active ? "bg-indigo-600 text-white" : ""}`}>
                  <Icon size={20} />
                  {name}
                </li>
              </AppLink>
            );
          })}*/}

          <AppLink href="/main/settings" prefetch={false} onClick={closeMenu} className={navItem}>
              <Settings size={20} />
              Settings
          </AppLink>

          {/* Tribe Dropdown */}
          <li className={navItem} onClick={() => setTribeOpen(!tribeOpen)}>
            <Users size={20} />
            Tribe
          </li>

          {tribeOpen && (
            <ul className="ml-6 space-y-1 max-h-64 overflow-y-auto">
          
              <li className="px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800">
                <AppLink
                  className="flex"
                  href="/main/tribe_request"
                  prefetch={false}
                  onClick={closeMenu}
                >
                  <Plus className="mr-1" /> Request a Tribe
                </AppLink>
              </li>
          
              <hr className="my-2 border-gray-300 dark:border-zinc-700" />
          
              {tribes.map((tribe) => (
                <li
                  key={tribe.id}
                  onClick={() => {
                    closeMenu();
                    push(`/main/tribe/${tribe.id}`);
                  }}
                  className="px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {tribe.name}
                </li>
              ))}
            </ul>
          )}
  
          <AppLink
            prefetch={false}
            className={navItem}
            onClick={closeMenu}
            href={"/main/requests"}
          >
            <Handshake size={20} />
            Connections
          </AppLink>
          <AppLink
            className={`${navItem} relative`}
            prefetch={false}
            onClick={closeMenu}
            href={`/main/invitation`}
          >
            <Mail size={20} />
            Invitations
            {inviteCount > 0 && (
              <span className="absolute top-2 left-2 min-w-4 h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] rounded-full">
                {inviteCount > 9 ? "9+" : inviteCount}
              </span>
            )}
          </AppLink>
          
          <button
            onClick={() => {
              closeMenu();
              showInvite();
            }}
            className={navItem}
          >
            <Share2 size={20} />
            <span>Invite Friends</span>
          </button>

        </ul>

        {/* Appearance */}
        <div className="space-y-2 pt-6 pb-14 border-t border-gray-200 dark:border-gray-800">

          <p className="text-xs uppercase opacity-60 px-2">
            Appearance
          </p>

          <button
            onClick={() => setTheme("system")}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 ${theme === "system" ? "bg-gray-200 dark:bg-zinc-800" : ""}`}
          >
            <Laptop size={18} />
            System
          </button>

          <button
            onClick={() => setTheme("light")}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 ${theme === "light" ? "bg-gray-200 dark:bg-zinc-800" : ""}`}
          >
            <Sun size={18} />
            Light
          </button>

          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 ${theme === "dark" ? "bg-gray-200 dark:bg-zinc-800" : ""}`}
          >
            <Moon size={18} />
            Dark
          </button>
  
          <button
            onClick={() => {
              closeMenu();
              logout();
            }}
            className="text-left text-red-400 px-4 py-2 rounded-lg hover:bg-red-900/30"
          >
            Logout
          </button>

        </div>

      </nav>
    </aside>
  );
}