'use client';

import {
  useEffect,
  useRef,
  useState
} from "react";

import { apiRequest } from "@/utils/api";

import SearchFilter from "@/components/SearchFilter";

import InviteUserCard from "./InviteUserCard";
import InviteSkeleton from "./InviteSkeleton";

type Props = {
  communityId: string;
};

export default function InviteMembers({
  communityId,
}: Props) {

  const [users, setUsers] = useState<any[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [nextUrl, setNextUrl] =
    useState<string | null>(null);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const loaderRef = useRef<any>(null);

  // 🔥 FETCH USERS
  const fetchUsers = async (
    url?: string,
    reset = false
  ) => {

    if (loading) return;

    try {

      setLoading(true);

      const endpoint =
        url ||
        `api/communities/${communityId}/invite-users/?q=${search}`;

      const data = await apiRequest(endpoint);

      setUsers(prev =>
        reset
          ? data.results
          : [...prev, ...data.results]
      );

      setNextUrl(data.next);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);
      setInitialLoading(false);

    }
  };

  // 🔥 INITIAL LOAD
  useEffect(() => {

    fetchUsers(undefined, true);

  }, []);

  // 🔥 SEARCH
  useEffect(() => {

    const delay = setTimeout(() => {

      fetchUsers(undefined, true);

    }, 400);

    return () => clearTimeout(delay);

  }, [search]);

  // 🔥 INFINITE SCROLL
  useEffect(() => {

    const observer = new IntersectionObserver(

      (entries) => {

        if (
          entries[0].isIntersecting &&
          nextUrl &&
          !loading
        ) {

          fetchUsers(nextUrl);

        }

      },

      {
        threshold: 1
      }

    );

    if (loaderRef.current) {

      observer.observe(loaderRef.current);

    }

    return () => {

      observer.disconnect();

    };

  }, [nextUrl, loading]);

  // 🔥 SEND INVITE
  const handleInvite = async (
    userId: number
  ) => {

    try {

      await apiRequest(
        `api/communities/${communityId}/send-invite/`,
        {
          method: "POST",

          data: {
            user_id: userId
          }
        }
      );

      setUsers(prev =>
        prev.map(user =>

          user.id === userId

            ? {
                ...user,
                invited: true
              }

            : user

        )
      );

    } catch (err) {

      console.error(err);

    }
  };

  return (
    <div className="max-w-2xl mx-auto">

      {/* SEARCH */}
      <div className="sticky top-0 z-20 p-3 border-b border-gray-200 dark:border-gray-800">

        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search users..."
        />

      </div>

      {/* LOADING */}
      {initialLoading ? (

        <InviteSkeleton />

      ) : (

        <>

          {/* EMPTY */}
          {!loading && users.length === 0 && (

            <div className="p-6 text-center text-sm text-gray-500">
              No users found
            </div>

          )}

          {/* USERS */}
          <div>

            {users.map(user => (

              <InviteUserCard
                key={user.id}
                user={user}
                onInvite={handleInvite}
              />

            ))}

          </div>

        </>

      )}

      {/* PAGINATION LOADER */}
      {loading && !initialLoading && (

        <div className="p-4 text-center text-sm text-gray-500">
          Loading more users...
        </div>

      )}

      {/* INTERSECTION OBSERVER */}
      <div
        ref={loaderRef}
        className="h-10"
      />

    </div>
  );
}