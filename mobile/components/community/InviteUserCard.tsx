'use client';

import AppLink from '@/components/AppLink';

type Props = {
  user: any;
  onInvite: (id: number) => void;
};

export default function InviteUserCard({
  user,
  onInvite,
}: Props) {

  return (
    <div className="flex items-center justify-between gap-3 p-3 border-b border-gray-200 dark:border-gray-800">

      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">

        <AppLink
          href={`/main/profile/${user.username}`}
          prefetch={false}
          className="flex-shrink-0"
        >

          {user.avatar ? (

            <img
              src={user.avatar}
              alt={user.username}
              className="w-12 h-12 rounded-full object-cover border border-gray-300 dark:border-gray-700"
            />

          ) : (

            <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
              {user.username.slice(0, 2).toUpperCase()}
            </div>

          )}

        </AppLink>

        <div className="min-w-0">

          <AppLink
            href={`/main/profile/${user.username}`}
            prefetch={false}
            className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate hover:underline"
          >
            {user.username}
          </AppLink>

        </div>

      </div>

      {/* RIGHT */}
      <button
        disabled={user.invited}
        onClick={() => onInvite(user.id)}
        className={`
          px-4
          py-2
          rounded-xl
          text-sm
          font-medium
          transition
          whitespace-nowrap

          ${
            user.invited
              ? "bg-green-500 text-white cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }
        `}
      >
        {user.invited ? "Invited ✓" : "Invite"}
      </button>

    </div>
  );
}