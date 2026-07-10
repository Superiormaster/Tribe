// hooks/useStarredUsers.ts
'use client';

import { useState, useEffect } from "react";
import { apiRequest } from '@/utils/api';

export function useStarredUsers() {
  const [starredUsers, setStarredUsers] =
    useState<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      const res = await apiRequest(
        "api/users/starred/"
      );

      setStarredUsers(
        new Set(res.starred_users)
      );
    })();
  }, []);

  return starredUsers;
}