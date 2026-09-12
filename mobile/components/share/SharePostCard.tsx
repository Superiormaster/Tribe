'use client';

import AppLink from '@/components/AppLink';
import {
  Share2,
  AlarmClock,
  MoreHorizontal,
  Trash2,
  Flag,
} from 'lucide-react';
import toast from "react-hot-toast";
import { useState, useEffect, useRef } from 'react';

import { timeAgo } from '@/utils/timeAgo';
import { starCreator } from '@/lib/api';
import PostCard from '@/components/PostCard';
import { apiRequest } from '@/utils/api';
import { useNavigation } from '@/utils/useNavigation';

type CardContext =
  | 'feed'
  | 'profile'
  | 'community'
  | 'search';

type ShareCardProps = {
  share: any;

  handlePostAction?: (
    action: string,
    postId: number,
  ) => void | Promise<void>;

  currentUser: any;

  canBulkSelect?: boolean;
  isSelected?: boolean;

  onSelect?: () => void;
  onLongPress?: () => void;

  setSelectMode?: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  hideStarButton?: boolean;
  starredUserIds?: Set<number>;
  shouldHideStar?: boolean;
  canModerateShares?: boolean;
  canReport?: boolean;
  context?: CardContext;
};

export default function ShareCard({
  share,
  handlePostAction,
  currentUser,
  context = 'feed',

  canBulkSelect = false,
  isSelected = false,

  onSelect,
  onLongPress,
  setSelectMode,

  hideStarButton = false,
  starredUserIds = new Set(),
  shouldHideStar = false,
  canModerateShares = false,
  canReport = true,
}: ShareCardProps) {

  const [isStarred, setIsStarred] =
    useState(false);
  const [menuOpen, setMenuOpen] =
    useState(false);
  const [reportOpen, setReportOpen] =
    useState(false);
  const [reportReason, setReportReason] =
    useState('');
  const [reportDetails, setReportDetails] =
    useState('');
  const menuRef =
    useRef<HTMLDivElement>(null);
  const { push } = useNavigation();
  const currentUserId =
    Number(currentUser?.id);
  const shareUserId =
    Number(share?.user?.id);
  const isOwnProfile =
    currentUserId === shareUserId;
  const hideStar =
    hideStarButton ||
    shouldHideStar ||
    isOwnProfile;

  useEffect(() => {

    const handleClickOutside =
      (e: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(
            e.target as Node
          )
        ) {
          setMenuOpen(false)
        }
      };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );
    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  const handleStar = async (
    userId: number
  ) => {
    if (
      userId === currentUserId
    ) {
      console.warn(
        'Cannot star yourself'
      );
      return;
    }

    const previous =
      isStarred;

    setIsStarred(
      !previous
    );

    try {
      const starred =
        await starCreator(
          userId
        );

      setIsStarred(
        starred
      );
    } catch (err: any) {
      if (
        err?.data?.error ===
        'You cannot star yourself'
      ) {
        console.warn(
          'Self-star blocked'
        );
        return;
      }

      setIsStarred(
        previous
      );
    }
  };

  useEffect(() => {
    if (!share?.user?.id) {
      return;
    }
    setIsStarred(
      starredUserIds.has(
        Number(share.user.id)
      )
    );
  }, [
    starredUserIds,
    share?.user?.id,
  ]);

  const handleDeleteShare = () => {
    handlePostAction?.(
      'delete_share',
      share.id
    );
  };

  const handleReport = async () => {
    if (!reportReason) {
      alert(
        'Please select a reason'
      );
      return;
    }

    if (!share?.post?.id) {
      alert(
        'Unable to report this post'
      );
      return;
    }

    try {
      await apiRequest(
        `api/post/${share.post.id}/report/`,
        {
          method: 'POST',
          data: {
            reason: reportReason,
            details: reportDetails,
          },
        }
      );

      toast.success(
        'Report submitted!'
      );

      setReportOpen(false);
      setReportReason('');
      setReportDetails('');

    } catch (err: any) {

      alert(
        err?.data?.message ||
        'Failed to submit report'
      );

      console.error(err);
    }
  };

  const isShareOwner =
    currentUserId === shareUserId;

  const canDeleteShare =
    isShareOwner ||
    canModerateShares;

  const openShare = () => {

    if (!share?.id) {
      return;
    }

    push(
      `/main/share/${share.id}`
    );
  };

  return (
    <>
      <div
        className={`
          relative
          block
          bg-white
          dark:bg-gray-900
          border-b-4
          border-gray-600
          p-2
          space-y-3
          ${
            canBulkSelect && isSelected
              ? "ring-2 ring-blue-500 rounded-xl"
              : ""
          }
        `}
        onContextMenu={(e) => {
          if (!canBulkSelect) return;
      
          e.preventDefault();
          onLongPress?.();
        }}
      >
        <div
          className="
            flex
            items-center
            gap-2
            mb-2
            text-gray-500
          "
        >
          {/* AVATAR */}
          <AppLink
            href={`/main/profile/${share.user.username}`}
            prefetch={false}
            className="flex-shrink-0"
          >
            {share.user.avatar ? (
              <img
                src={share.user.avatar}
                alt={share.user.username}
                className="
                  w-10
                  h-10
                  rounded-full
                  border-2
                  border-gray-400
                  dark:border-white
                  object-cover
                  cursor-pointer
                "
              />
            ) : (
              <div
                className="
                  w-10
                  h-10
                  rounded-full
                  bg-gray-400
                  flex
                  items-center
                  justify-center
                  text-white
                  font-bold
                  cursor-pointer
                "
              >
                {share.user.username
                  ?.slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
          </AppLink>

          {/* USERNAME */}
          <AppLink
            href={`/main/profile/${share.user.username}`}
            prefetch={false}
            className="
              font-semibold
              hover:underline
            "
          >
            {share.user.username}
          </AppLink>

          {/* STAR BUTTON */}
          {!hideStar && (
            !isStarred ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (
                    !share?.user?.id
                  ) {
                    return;
                  }
                  handleStar(
                    Number(
                      share.user.id
                    )
                  );
                }}
                className="
                  text-xs
                  px-2
                  py-1
                  bg-indigo-600
                  text-white
                  rounded-md
                  hover:bg-indigo-700
                "
              >
                Star
              </button>
            ) : (
              <span
                className="
                  text-xs
                  px-2
                  py-1
                  text-white
                  rounded-md
                  hover:bg-yellow-600
                "
              >
                ⭐
              </span>
            )
          )}

          {/* SHARE LABEL */}
          <span
            className="
              flex
              items-center
              gap-1
            "
          >
            <Share2
              className="w-4 h-4"
            />
            shared
          </span>

          {/* TIME */}
          <span
            className="
              ml-2
              flex
              flex-1
              items-center
              text-gray-500
              text-sm
            "
          >
            <AlarmClock
              className="text-sm mr-1"
            />
            {timeAgo(
              share.created_at
            )}
          </span>

          {(canDeleteShare ||
            canReport) && (
            <div
              className="relative"
              ref={menuRef}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(
                    !menuOpen
                  );
                }}
                className="
                  p-1
                  rounded-full
                  hover:bg-gray-200
                  dark:hover:bg-gray-800
                "
              >
                <MoreHorizontal
                  className="w-5 h-5"
                />
              </button>

              {menuOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-full
                    mt-1
                    w-36
                    bg-white
                    dark:bg-gray-800
                    border
                    border-gray-300
                    dark:border-gray-700
                    rounded-lg
                    shadow-lg
                    z-50
                  "
                >
                  {/* DELETE */}
                  {canDeleteShare && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteShare();
                        setMenuOpen(
                          false
                        );
                      }}
                      className="
                        flex
                        items-center
                        gap-2
                        w-full
                        px-3
                        py-2
                        text-red-500
                        hover:bg-gray-100
                        dark:hover:bg-gray-700
                      "
                    >
                      <Trash2
                        className="w-4 h-4"
                      />
                      Delete
                    </button>
                  )}

                  {/* REPORT */}
                  {canReport &&
                    !isShareOwner && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(
                          false
                        );
                        setReportOpen(
                          true
                        );
                      }}
                      className="
                        flex
                        items-center
                        gap-2
                        w-full
                        px-3
                        py-2
                        text-left
                        text-gray-700
                        dark:text-gray-400
                        hover:bg-gray-100
                        dark:hover:bg-gray-700
                      "
                    >
                      <Flag
                        className="w-4 h-4"
                      />
                      Report
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          onClick={openShare}
        >
          {/* SHARE TEXT */}
          {share.share_text && (
            <div
              className="
                text-gray-800
                dark:text-gray-200
                mb-2
                whitespace-pre-line
              "
            >
              {share.share_text}
            </div>
          )}

          <div
            className="
              border
              border-gray-300
              dark:border-gray-700
              rounded-2xl
              overflow-hidden
            "
          >
            {share.post && (
              <PostCard
                post={share.post}
                hideCommunityName={false}
                isEmbedded={true}
                canEdit={false}
                canDelete={false}
                canRepost={false}
                showPinnedLabel={false}
                showManageButtons={false}
                handlePostAction={
                  handlePostAction
                }
                hideStarButton={true}
                showJoinButton={false}
                shouldHideStar={true}
                isShareContext={true}
                shareId={share.id}
                shareOwnerId={
                  share.user.id
                }
              />
            )}
          </div>
        </div>
      </div>

      {reportOpen && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/50
            p-4
          "
          onClick={() =>
            setReportOpen(false)
          }
        >

          <div
            className="
              w-full
              max-w-md
              rounded-xl
              bg-white
              dark:bg-gray-900
              p-5
              shadow-xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h2
              className="
                text-lg
                font-semibold
                text-gray-900
                dark:text-gray-100
                mb-4
              "
            >
              Report post
            </h2>

            {/* REASON */}
            <label
              className="
                block
                text-sm
                font-medium
                text-gray-700
                dark:text-gray-300
                mb-2
              "
            >
              Reason
            </label>

            <select
              value={reportReason}
              onChange={(e) =>
                setReportReason(
                  e.target.value
                )
              }
              className="
                w-full
                rounded-lg
                border
                border-gray-300
                dark:border-gray-700
                bg-white
                dark:bg-gray-800
                text-gray-900
                dark:text-gray-100
                px-3
                py-2
                mb-4
              "
            >
              <option value="">
                Select a reason
              </option>
              <option value="spam">
                Spam
              </option>
              <option value="harassment">
                Harassment
              </option>
              <option value="hate">
                Hate speech
              </option>
              <option value="violence">
                Violence
              </option>
              <option value="nudity">
                Nudity or sexual content
              </option>
              <option value="misinformation">
                False information
              </option>
              <option value="other">
                Other
              </option>
            </select>

            {/* DETAILS */}
            <label
              className="
                block
                text-sm
                font-medium
                text-gray-700
                dark:text-gray-300
                mb-2
              "
            >
              Additional details
            </label>

            <textarea
              value={reportDetails}
              onChange={(e) =>
                setReportDetails(
                  e.target.value
                )
              }
              rows={4}
              placeholder="Tell us more..."
              className="
                w-full
                rounded-lg
                border
                border-gray-300
                dark:border-gray-700
                bg-white
                dark:bg-gray-800
                text-gray-900
                dark:text-gray-100
                px-3
                py-2
                resize-none
              "
            />

            {/* BUTTONS */}
            <div
              className="
                flex
                justify-end
                gap-2
                mt-5
              "
            >
              <button
                onClick={() => {
                  setReportOpen(
                    false
                  );
                  setReportReason(
                    ''
                  );
                  setReportDetails(
                    ''
                  );
                }}
                className="
                  px-4
                  py-2
                  rounded-lg
                  bg-gray-200
                  dark:bg-gray-700
                  text-gray-800
                  dark:text-gray-200
                "
              >
                Cancel
              </button>
  
              <button
                onClick={handleReport}
                className="
                  px-4
                  py-2
                  rounded-lg
                  bg-red-600
                  text-white
                  hover:bg-red-700
                "
              >
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}