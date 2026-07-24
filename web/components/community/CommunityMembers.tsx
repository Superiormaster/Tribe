'use client';

import { useState, useEffect } from "react";
import { apiRequest } from "@/utils/api";
import SearchFilter from "@/components/SearchFilter";
import AppLink from '@/components/AppLink';  

type Props = {
  members: any[];
  isOwner: boolean;
  communityId: string;
};

export default function CommunityMembers({
  members,
  isOwner,
  communityId,
}: Props) {
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setFilteredMembers(members);
  }, [members]);

  // 🔥 SEARCH MEMBERS
  useEffect(() => {

    const delay = setTimeout(() => {
      fetchMembers();
    }, 300);

    return () => clearTimeout(delay);

  }, [search]);

  const fetchMembers = async () => {

    if (!search.trim()) {
      setFilteredMembers(members);
      return;
    }

    try {

      setLoading(true);

      const data = await apiRequest(
        `api/communities/${communityId}/members/?q=${search}`
      );

      setFilteredMembers(data);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  };
  
  const action = async (url: string, user_id: number) => {
    await apiRequest(`api/communities/${communityId}/${url}/`, {
      method: "POST",
      data: { user_id },
    });

    setSelectedMember(null);
  };
  
  return (
    <div className="relative">

      {loading && (
        <p className="text-sm text-gray-500 p-3">
          Searching members...
        </p>
      )}

      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search members..."
      />

      {!loading && filteredMembers.length === 0 && (
        <p className="text-sm text-gray-500 p-4">
          No members found
        </p>
      )}

      {filteredMembers.map((m) => (
        <div
          key={m.id}
          className="flex justify-between items-center z-10 p-3 border-b"
        >

          <div className="flex items-center gap-3">

            <AppLink href={`/main/profile/${m.username}`} prefetch={false} className="flex-shrink-0">  
              {m.avatar ? (  
                <img  
                  src={m.avatar}  
                  alt={m.username}  
                  className="w-10 h-10 rounded-full border-2 border-gray-400 dark:border-white object-cover cursor-pointer"  
                />  
              ) : (  
                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold cursor-pointer">  
                  {m.username.slice(0,2).toUpperCase()}  
                </div>  
              )}  
            </AppLink>  

            <div>
              <AppLink
                href={`/main/profile/${m.username}`}
                prefetch={false}
                className="font-bold text-gray-900 dark:text-gray-100 hover:underline"
              >
                {m.username}
              </AppLink>

              <div className="text-xs text-gray-500">
                {m.role}
              </div>
            </div>

          </div>

          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("clicked");
                setSelectedMember(m);
              }}
              className="relative text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 z-50 p-2"
            >
              ⋮
            </button>
          )}
        </div>
      ))}

      {isOwner && selectedMember && (
        <div className="space-y-2 absolute right-3 bottom-12 z-[9999] w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl p-2 flex flex-col gap-2">

          <p className="text-sm text-gray-500">
            Actions for <b>{selectedMember.username}</b>
          </p>
      
          <button
            onClick={() =>
              action("add_moderator", selectedMember.id)
            }
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
          >
            Make Moderator
          </button>
      
          <button
            onClick={() =>
              action("remove_moderator", selectedMember.id)
            }
            className="text-xs px-2 py-1 bg-red-500 text-white rounded"
          >
            Remove Moderator
          </button>
      
          <button
            onClick={() =>
              action("add_admin", selectedMember.id)
            }
            className="text-xs px-2 py-1 bg-indigo-500 text-white rounded"
          >
            Make Admin
          </button>
      
          <button
            onClick={() =>
              action("remove_admin", selectedMember.id)
            }
            className="text-xs px-2 py-1 bg-yellow-500 text-black rounded"
          >
            Remove Admin
          </button>
  
          <button 
            onClick={() =>
              action("ban", selectedMember.id)
            } 
            className="text-xs px-2 py-1 bg-red-500 text-white rounded">
            Ban
          </button> 

          <button 
            onClick={() =>
              action("unban", selectedMember.id)
            }
            className="text-xs px-2 py-1 bg-red-500 text-white rounded">
            Restore ban
          </button> 

          <button
            onClick={() => setSelectedMember(null)}
            className="w-full bg-gray-300 text-black p-2 rounded"
          >
            Close
          </button>
        </div>
      )}

    </div>
  );
}