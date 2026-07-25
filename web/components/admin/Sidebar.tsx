'use client';

import AppLink from '@/components/AppLink';
import { usePathname } from 'next/navigation';
import { useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Users,
  Flag,
  Settings,
  MessageSquare,
  Sun,
  Moon,
  Laptop,
  X,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  closeMenu: () => void;
}

export default function Sidebar({
  open,
  closeMenu,
}: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useContext(UserContext) || {};

  const links = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Users',
      path: '/admin/users',
      icon: Users,
    },
    {
      name: 'Reports',
      path: '/admin/reports',
      icon: Flag,
    },
    {
      name: 'Tribes',
      path: '/admin/tribes',
      icon: Users,
    },
    {
      name: 'Tribe Request',
      path: '/admin/tribe_request',
      icon: Users,
    },
    {
      name: 'Feedback',
      path: '/admin/feedback',
      icon: MessageSquare,
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
    },
  ];

  const navItem =
    'flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-gray-200 dark:hover:bg-zinc-800';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeMenu}
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${
          open
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen w-64
          bg-white dark:bg-black
          text-gray-900 dark:text-white
          border-r border-gray-200 dark:border-zinc-800
          transform transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
          <h1 className="text-xl font-bold">
            Tribe Admin
          </h1>

          <button
            onClick={closeMenu}
            className="lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {links.map(({ name, path, icon: Icon }) => {
              const active = pathname === path;

              return (
                <li key={name}>
                  <AppLink
                    href={path}
                    onClick={closeMenu}
                    className={`${navItem} ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : ''
                    }`}
                  >
                    <Icon size={20} />
                    {name}
                  </AppLink>
                </li>
              );
            })}
          </ul>
          {user?.role === "superadmin" && (
              <AppLink className='flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-gray-200 dark:hover:bg-zinc-800' href="/admin/create_admin">
                  <Users /> Create Admin
              </AppLink>
          )}

          {/* Theme */}
          <div className="pt-8 mt-8 border-t border-gray-200 dark:border-zinc-800 space-y-2">
            <p className="text-xs uppercase opacity-60 px-2">
              Appearance
            </p>

            <button
              onClick={() => setTheme('system')}
              className={`${navItem} w-full ${
                theme === 'system'
                  ? 'bg-gray-200 dark:bg-zinc-800'
                  : ''
              }`}
            >
              <Laptop size={18} />
              System
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`${navItem} w-full ${
                theme === 'light'
                  ? 'bg-gray-200 dark:bg-zinc-800'
                  : ''
              }`}
            >
              <Sun size={18} />
              Light
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`${navItem} w-full ${
                theme === 'dark'
                  ? 'bg-gray-200 dark:bg-zinc-800'
                  : ''
              }`}
            >
              <Moon size={18} />
              Dark
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}