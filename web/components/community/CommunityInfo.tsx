'use client';

import {
useCallback,
useEffect,
useState,
} from 'react';

import { useNavigation } from '@/utils/useNavigation';
import { apiRequest } from '@/utils/api';
import { useContext } from 'react';
import { UserContext } from '@/components/UserContext';
import { useShareSheet } from '@/components/share/ShareContext'

import {
ArrowLeft,
Bell,
BellOff,
CalendarDays,
ChevronRight,
Crown,
Globe,
LogOut,
Share2,
Shield,
Users,
} from 'lucide-react';

type CommunityPerson = {
id: number;
username: string;
avatar?: string | null;
role?: string | null;
};

type CommunityData = {
id: number;
name: string;
description?: string | null;
rules?: string | null;

cover_image_url?: string | null;
intro_video_url?: string | null;

website?: string | null;

members_count?: number;

owner?: CommunityPerson | null;
admins?: CommunityPerson[];
moderators?: CommunityPerson[];

my_role?: string | null;
joined?: boolean;

permissions?: {
allow_reels?: boolean;
allow_videos?: boolean;
};
};

type Props = {
communityId: number;
};

export default function CommunityInfo({
communityId,
}: Props) {
const { user } = useContext(UserContext)!;
const { back, push } = useNavigation();
const { showShare } = useShareSheet();

const [community, setCommunity] =
useState<CommunityData | null>(null);

const [loading, setLoading] =
useState(true);

const [error, setError] =
useState<string | null>(null);

const [isMuted, setIsMuted] =
useState(false);

const [showAdmins, setShowAdmins] =
useState(false);

const [showModerators, setShowModerators] =
useState(false);

const currentUserId =
Number(user?.id);

const isOwner =
Number(community?.owner?.id) ===
currentUserId ||
community?.my_role === 'owner';

const canManage =
isOwner ||
community?.my_role === 'admin' ||
community?.my_role === 'moderator';

// =========================
// LOAD COMMUNITY INFO
// =========================

useEffect(() => {
let cancelled = false;

const loadCommunity = async () => {
  try {
    setLoading(true);
    setError(null);

    const data =
      await apiRequest(
        `api/communities/${communityId}/info/`
      );

    if (!cancelled) {
      setCommunity(data);

      // Backend can return this later.
      setIsMuted(
        Boolean(data?.is_muted)
      );
    }
  } catch (err) {
    console.error(
      '[COMMUNITY INFO] Failed to load:',
      err
    );

    if (!cancelled) {
      setError(
        'Unable to load community information.'
      );
    }
  } finally {
    if (!cancelled) {
      setLoading(false);
    }
  }
};

loadCommunity();

return () => {
  cancelled = true;
};

}, [communityId]);

const handleLeave = async () => {
  if (!community) return;

  const confirmed = window.confirm(
    `Are you sure you want to leave "${community.name}"?`
  );

  if (!confirmed) return;

  try {
    await apiRequest(
      `api/communities/${communityId}/leave/`,
      {
        method: "POST",
      }
    );

    push("/main/messages/");

  } catch (err) {
    console.error(
      "[COMMUNITY INFO] Failed to leave community:",
      err
    );

    alert(
      "Failed to leave community. Please try again."
    );
  }
};

const rules = (community?.rules || "")
  .split("\n")
  .map((rule: string) => rule.trim())
  .filter(Boolean);

const handleShowAdmins = () => {
  setShowAdmins(prev => !prev);
};

const handleShowModerators = () => {
  setShowModerators(prev => !prev);
};

// =========================
// MUTE
// =========================

const handleMute = async () => {
try {
await apiRequest(
`api/communities/${communityId}/mute/`,
{
method: isMuted
? 'DELETE'
: 'POST',
}
);

  setIsMuted(prev => !prev);
} catch (err) {
  console.error(
    '[COMMUNITY INFO] Mute failed:',
    err
  );
}

};

// =========================
// PROFILE
// =========================

const openProfile = (
username?: string | null
) => {
if (!username) return;

push(
  `/main/profile/${username}`
);

};

// =========================
// LOADING
// =========================

if (loading) {
return (
<div className="min-h-screen bg-white dark:bg-[#0b141a]">
<div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-4">
<div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
</div>

    <div className="animate-pulse">
      <div className="h-52 bg-gray-200 dark:bg-gray-800" />

      <div className="px-5 pt-5">
        <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-800" />

        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800 mt-3" />

        <div className="h-16 w-full rounded bg-gray-200 dark:bg-gray-800 mt-5" />
      </div>
    </div>
  </div>
);

}

// =========================
// ERROR
// =========================

if (error || !community) {
return (
<div className="min-h-screen bg-white dark:bg-[#0b141a] flex flex-col">
<header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center px-4">
<button
onClick={back}
className="p-2 -ml-2"
>
<ArrowLeft size={22} />
</button>

      <h1 className="ml-2 font-semibold">
        Community Info
      </h1>
    </header>

    <div className="flex-1 flex items-center justify-center px-6 text-center">
      <div>
        <p className="text-gray-500">
          {error ||
            'Community not found.'}
        </p>

        <button
          onClick={back}
          className="mt-4 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

}

return (
<div className="min-h-screen bg-gray-100 dark:bg-[#0b141a] text-gray-900 dark:text-gray-100">

  {/* =========================
      HEADER
  ========================= */}

  <header className="
    sticky
    top-0
    z-30
    h-14
    bg-white
    dark:bg-gray-900
    border-b
    border-gray-200
    dark:border-gray-800
    flex
    items-center
    px-4
  ">
    <button
      onClick={back}
      className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <ArrowLeft size={22} />
    </button>

    <h1 className="ml-2 font-semibold">
      Community Info
    </h1>
  </header>

  <main className="max-w-2xl mx-auto pb-10">

    {/* =========================
        COVER
    ========================= */}

    <div className="relative h-52 bg-gray-300 dark:bg-gray-800 overflow-hidden">

      {community.cover_image_url ? (
        <img
          src={community.cover_image_url}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl font-bold">
          {community.name
            ?.charAt(0)
            ?.toUpperCase()}
        </div>
      )}
    </div>

    {/* =========================
        BASIC INFO
    ========================= */}

    <section className="bg-white dark:bg-gray-900 px-5 py-5">

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <h2 className="text-2xl font-bold break-words">
            {community.name}
          </h2>

          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Users size={16} />

            <span>
              {community.members_count ?? 0} members
            </span>
          </div>

        </div>

        {/*<button
          onClick={showShare}
          className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0"
          aria-label="Share community"
        >
          <Share2 size={19} />
        </button>*/}

      </div>

      {community.description && (
        <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {community.description}
        </p>
      )}

      {community.website && (
        <a
          href={community.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 break-all"
        >
          <Globe size={17} />
          <span>
            {community.website}
          </span>
        </a>
      )}

    </section>

    {/* =========================
        RULES
    ========================= */}
    
    {rules.length > 0 && (
      <section className="mt-2 bg-white dark:bg-gray-900">
    
        <div className="px-5 py-4">
    
          <h3 className="font-semibold">
            Community Rules
          </h3>
    
          <div className="mt-3 space-y-3">
            {rules.map((rule: string, index: number) => (
              <div
                key={index}
                className="flex gap-3 text-sm leading-6"
              >
                <span className="font-semibold shrink-0">
                  {index + 1}.
                </span>
    
                <p className="whitespace-pre-wrap">
                  {rule}
                </p>
              </div>
            ))}
          </div>
    
        </div>
    
      </section>
    )}

    {/* =========================
        OWNER
    ========================= */}

    {community.owner && (
      <section className="mt-2 bg-white dark:bg-gray-900">

        <div className="px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-500">
            Owner
          </h3>
        </div>

        <button
          onClick={() =>
            openProfile(
              community.owner?.username
            )
          }
          className="
            w-full
            px-5
            py-3
            flex
            items-center
            gap-3
            text-left
            hover:bg-gray-50
            dark:hover:bg-gray-800
          "
        >

          <div className="
            h-11
            w-11
            rounded-full
            overflow-hidden
            bg-gray-300
            dark:bg-gray-700
            flex
            items-center
            justify-center
            shrink-0
          ">
            {community.owner.avatar ? (
              <img
                src={community.owner.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-semibold">
                {community.owner.username
                  ?.charAt(0)
                  ?.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              @{community.owner.username}
            </p>

            <p className="text-xs text-gray-500">
              Community owner
            </p>
          </div>

          <Crown
            size={18}
            className="text-yellow-500"
          />

        </button>

      </section>
    )}

    {/* =========================
        ADMINS
    ========================= */}
    
    <section className="mt-2 bg-white dark:bg-gray-900">
    
      <button
        onClick={handleShowAdmins}
        className="
          w-full
          px-5
          py-4
          flex
          items-center
          gap-3
          text-left
          hover:bg-gray-50
          dark:hover:bg-gray-800
        "
      >
    
        <Shield size={20} />
    
        <div className="flex-1">
          <p className="font-medium">
            Admins
          </p>
    
          <p className="text-xs text-gray-500">
            {community.admins?.length || 0} community administrator
            {(community.admins?.length || 0) !== 1 ? "s" : ""}
          </p>
        </div>
    
        <ChevronRight
          size={19}
          className={`
            transition-transform
            ${showAdmins ? "rotate-90" : ""}
          `}
        />
    
      </button>
    
      {showAdmins && (
        <div className="border-t border-gray-100 dark:border-gray-800">
    
          {!community.admins?.length ? (
            <div className="px-5 py-6 text-sm text-gray-500 text-center">
              No administrators found.
            </div>
          ) : (
            community.admins.map(admin => (
              <button
                key={admin.id}
                onClick={() =>
                  openProfile(admin.username)
                }
                className="
                  w-full
                  px-5
                  py-3
                  flex
                  items-center
                  gap-3
                  text-left
                  hover:bg-gray-50
                  dark:hover:bg-gray-800
                "
              >
    
                <div className="
                  h-10
                  w-10
                  rounded-full
                  overflow-hidden
                  bg-gray-300
                  dark:bg-gray-700
                  flex
                  items-center
                  justify-center
                  shrink-0
                ">
    
                  {admin.avatar ? (
                    <img
                      src={admin.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-medium">
                      {admin.username
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </span>
                  )}
    
                </div>
    
                <div className="flex-1 min-w-0">
    
                  <p className="font-medium truncate">
                    @{admin.username}
                  </p>
    
                  <p className="text-xs text-gray-500">
                    Administrator
                  </p>
    
                </div>
    
              </button>
            ))
          )}
    
        </div>
      )}
    
    </section>

    {/* =========================
        MODERATORS
    ========================= */}
    
    <section className="mt-2 bg-white dark:bg-gray-900">
    
      <button
        onClick={handleShowModerators}
        className="
          w-full
          px-5
          py-4
          flex
          items-center
          gap-3
          text-left
          hover:bg-gray-50
          dark:hover:bg-gray-800
        "
      >
    
        <Shield size={20} />
    
        <div className="flex-1">
    
          <p className="font-medium">
            Moderators
          </p>
    
          <p className="text-xs text-gray-500">
            {community.moderators?.length || 0} community moderator
            {(community.moderators?.length || 0) !== 1 ? "s" : ""}
          </p>
    
        </div>
    
        <ChevronRight
          size={19}
          className={`
            transition-transform
            ${showModerators ? "rotate-90" : ""}
          `}
        />
    
      </button>
    
      {showModerators && (
        <div className="border-t border-gray-100 dark:border-gray-800">
    
          {!community.moderators?.length ? (
            <div className="px-5 py-6 text-sm text-gray-500 text-center">
              No moderators found.
            </div>
          ) : (
            community.moderators.map(moderator => (
              <button
                key={moderator.id}
                onClick={() =>
                  openProfile(moderator.username)
                }
                className="
                  w-full
                  px-5
                  py-3
                  flex
                  items-center
                  gap-3
                  text-left
                  hover:bg-gray-50
                  dark:hover:bg-gray-800
                "
              >
    
                <div className="
                  h-10
                  w-10
                  rounded-full
                  overflow-hidden
                  bg-gray-300
                  dark:bg-gray-700
                  flex
                  items-center
                  justify-center
                  shrink-0
                ">
    
                  {moderator.avatar ? (
                    <img
                      src={moderator.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-medium">
                      {moderator.username
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </span>
                  )}
    
                </div>
    
                <div className="flex-1 min-w-0">
    
                  <p className="font-medium truncate">
                    @{moderator.username}
                  </p>
    
                  <p className="text-xs text-gray-500">
                    Moderator
                  </p>
    
                </div>
    
              </button>
            ))
          )}
    
        </div>
      )}
    
    </section>

    {/* =========================
        ACTIONS
    ========================= */}

    <section className="mt-2 bg-white dark:bg-gray-900">

      {/* MUTE */}

      {/*}{!isOwner && (
        <button
          onClick={handleMute}
          className="
            w-full
            px-5
            py-4
            flex
            items-center
            gap-3
            text-left
            hover:bg-gray-50
            dark:hover:bg-gray-800
          "
        >
  
          {isMuted ? (
            <Bell size={20} />
          ) : (
            <BellOff size={20} />
          )}
  
          <span>
            {isMuted
              ? 'Unmute notifications'
              : 'Mute notifications'}
          </span>
  
        </button>
      )}*/}

      {/* MANAGE */}

      {canManage && (
        <button
          onClick={() =>
            push(
              `/main/community/${communityId}/settings`
            )
          }
          className="
            w-full
            px-5
            py-4
            flex
            items-center
            gap-3
            text-left
            hover:bg-gray-50
            dark:hover:bg-gray-800
          "
        >

          <Shield size={20} />

          <span className="flex-1">
            Manage Community
          </span>

          <ChevronRight size={19} />

        </button>
      )}

      {/* LEAVE */}

      {!isOwner && (
        <button
          onClick={handleLeave}
          className="
            w-full
            px-5
            py-4
            flex
            items-center
            gap-3
            text-left
            text-red-600
            hover:bg-red-50
            dark:hover:bg-red-950/20
          "
        >

          <LogOut size={20} />

          <span>
            Leave Community
          </span>

        </button>
      )}

    </section>

  </main>
</div>

);
}