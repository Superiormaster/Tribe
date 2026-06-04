'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api';

interface Invite {
  id: number;
  community: {
    id: number;
    name: string;
  };
  sender: {
    id: number;
    username: string;
    avatar?: string;
  };
}

export default function CommunityInvitesPage() {

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const res = await apiRequest("api/communities/invites/");
  
      const list = Array.isArray(res) ? res : (res.results ?? []);
  
      setInvites(list);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async (inviteId: number) => {

    try {

      await apiRequest(
        `api/communities/${inviteId}/accept/`,
        {
          method: 'POST'
        }
      );

      setInvites(prev =>
        prev.filter(invite => invite.id !== inviteId)
      );

    } catch (err) {
      console.error(err);
    }
  };

  const declineInvite = async (inviteId: number) => {

    try {

      await apiRequest(
        `api/communities/${inviteId}/decline/`,
        {
          method: 'POST'
        }
      );

      setInvites(prev =>
        prev.filter(invite => invite.id !== inviteId)
      );

    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-500">
        Loading invites...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4">

      <h1 className="text-2xl font-bold mb-4">
        Community Invitations
      </h1>

      {(invites?.length ?? 0) === 0 && (
        <div className="text-gray-500">
          No pending invites
        </div>
      )}

      <div className="space-y-4">

        {invites.map((invite) => (

          <div
            key={invite.id}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
          >

            <div className="flex items-center gap-3">

              <img
                src={
                  invite.sender.avatar ||
                  '/default-avatar.png'
                }
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />

              <div>

                <p className="font-semibold">
                  {invite.sender.username}
                </p>

                <p className="text-sm text-gray-500">
                  invited you to join
                </p>

                <p className="text-sm font-medium">
                  {invite.community.name}
                </p>

              </div>

            </div>

            <div className="flex gap-2">

              <button
                onClick={() => acceptInvite(invite.id)}
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm"
              >
                Accept
              </button>

              <button
                onClick={() => declineInvite(invite.id)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm"
              >
                Decline
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}