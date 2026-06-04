'use client';

import { useEffect } from 'react';
import { useNavigation } from "@/utils/useNavigation"
import { apiRequest } from '@/utils/api';
import Sidebar from '@/components/admin/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { push } = useNavigation()

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await apiRequest('api/auth/me/');

        if (
          user.creator_type !== 'admin' &&
          user.creator_type !== 'superadmin'
        ) {
          push('/');
        }
      } catch (err) {
        push('/login');
      }
    };

    checkAdmin();
  }, [push]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}