"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/utils/api";
import CommunityPage from '@/components/CommunityPage';

export default function Page({ params }: { params: { id: string } }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const data = await apiRequest('api/users/me/');
      setUser(data);
    };
    fetchUser();
  }, []);
  
  return <CommunityPage communityId={params.id} user={user} />;
}