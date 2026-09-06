import {
  useState,
  useEffect,
} from "react";

import { apiRequest } from '@/utils/api';

export function useStarredUsers() {
  const [
    starredUsers,
    setStarredUsers,
  ] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    let mounted = true;

    const fetchStarredUsers =
      async () => {
        try {
          const res =
            await apiRequest(
              "api/users/starred/"
            );

          if (!mounted) {
            return;
          }

          setStarredUsers(
            new Set(
              res.starred_users || []
            )
          );
        } catch (error) {
          console.error(
            "[useStarredUsers] Failed to fetch starred users:",
            error
          );
        }
      };

    fetchStarredUsers();

    return () => {
      mounted = false;
    };
  }, []);

  return starredUsers;
}