'use client'

import { useState } from "react"
import AppLink from '@/components/AppLink';
import { Home, MessageSquare, PlusCircle, Search, Bell, Menu } from "lucide-react";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import Image from "next/image";
import { tribe2 } from "@/assets";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function Navbar() {

  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    latency,
  } = useNetwork();

  const navItems = [
    { name: "Home", path: "/main/home", icon: Home },
    { name: "Messages", path: "/main/messages", icon: MessageSquare },
    { name: "Create", path: "/main/create-post", icon: PlusCircle },
    { name: "Search", path: "/main/search", icon: Search },
    { name: "Notification", path: "/main/notification", icon: Bell },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-40 flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 shadow-md">

        {/* LEFT — Logo */}
        <div className="w-16 h-16 border dark:border-indigo-600 rounded-full overflow-hidden shadow">
          <Image src={tribe2} alt="Tribe Logo" />
        </div>

        {/* CENTER — Navigation Icons */}
        <ul className="hidden md:flex items-center gap-6">
          {navItems.map(({ name, path, icon: Icon }) => {

            const active = pathname === path;

            return (
              <AppLink key={name} prefetch={false} href={path}>
                <li
                  className={`p-2 rounded-lg transition cursor-pointer text-indigo-500 dark:text-white
                  ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-gray-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Icon size={22} />
                </li>
              </AppLink>
            );
          })}

          {/* Connection Status */}
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-gray-700 dark:text-gray-200 text-sm">
            🟢 {Math.round(latency ?? 0)} ms
          </div>
        </ul>

        {/* RIGHT — Menu Button */}
        
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 hidden md:block rounded-lg hover:bg-gray-200 bg-indigo-500 dark:hover:bg-zinc-800"
        >
          <Menu size={24} />
        </button>

        <div className="md:hidden flex justify-between gap-5">
          <AppLink
            href={`/main/search`}
            prefetch={false}
            className="p-2 rounded-lg hover:bg-gray-200 bg-indigo-500 dark:hover:bg-zinc-800"
          >
            <Search size={24} />
          </AppLink>
  
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-200 bg-indigo-500 dark:hover:bg-zinc-800"
          >
            <Menu size={24} />
          </button>
        </div>

      </nav>

      {/* Sidebar Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />

          <div className="absolute right-0 top-0 h-full w-72 bg-white dark:bg-gray-900 shadow-xl">
            <Sidebar closeMenu={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}