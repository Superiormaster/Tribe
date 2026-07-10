'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { useNavigation } from '@/utils/useNavigation';
import { usePathname } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import Sidebar from '@/components/admin/Sidebar';
import Skeleton from '@/components/Skeleton';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { push } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();
  
  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecking(false);
      return;
    }
  
    const checkAdmin = async () => {
      try {
        const user = await apiRequest("api/admin/me/");
  
        if (
          user.role !== "admin" &&
          user.role !== "superadmin"
        ) {
          push("/admin/login");
          return;
        }
  
        setChecking(false);
      } catch {
        push("/admin/login");
      }
    };
  
    checkAdmin();
  }, [pathname, push]);
  
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }
  
  if (checking) {
    return <Skeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-950">
      <Sidebar
        open={sidebarOpen}
        closeMenu={() =>
          setSidebarOpen(false)
        }
      />

      <div className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center p-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black">
          <button
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            <Menu className="dark:text-white text-gray-700" size={24} />
          </button>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}