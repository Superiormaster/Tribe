'use client';

type Props = {
  open: boolean;
  onClose: () => void;
  muted: boolean;
  isOwner: boolean;
  canManage: boolean;
  onInfo: () => void;
  onSearch: () => void;
  onMute: () => void;
  onReport: () => void;
  onLeave: () => void;
  onManage: () => void;
};

export default function CommunityOptionsModal({
  open,
  onClose,
  muted,
  isOwner,
  canManage,
  onInfo,
  onSearch,
  onMute,
  onReport,
  onLeave,
  onManage,
}: Props) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90]"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className="
          absolute
          right-2
          top-9
          mt-2
          w-52
          bg-white
          dark:bg-[#111b21]
          text-gray-700
          dark:text-gray-300
          border
          border-gray-200
          dark:border-gray-700
          rounded-xl
          shadow-xl
          z-[100]
          overflow-hidden
        "
      >
        {/* Community Info */}
        <button
          onClick={onInfo}
          className="
            w-full
            text-left
            px-4
            py-3
            hover:bg-gray-100
            dark:hover:bg-gray-800
          "
        >
          Community Info
        </button>

        {/* Search */}
        {/*}<button
          onClick={onSearch}
          className="
            w-full
            text-left
            px-4
            py-3
            hover:bg-gray-100
            dark:hover:bg-gray-800
          "
        >
          Search Messages
        </button>*/}

        {/* Mute */}
        {!isOwner && (
          <button
            onClick={onMute}
            className="
              w-full
              text-left
              px-4
              py-3
              hover:bg-gray-100
              dark:hover:bg-gray-800
            "
          >
            {muted ? 'Unmute Notifications' : 'Mute Notifications'}
          </button>
        )}

        {/* Manage Community */}
        {canManage && (
          <button
            onClick={onManage}
            className="
              w-full
              text-left
              px-4
              py-3
              hover:bg-gray-100
              dark:hover:bg-gray-800
            "
          >
            Manage Community
          </button>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700" />

        {/* Report */}
        {!canManage && (
          <button
            onClick={onReport}
            className="
              w-full
              text-left
              px-4
              py-3
              hover:bg-gray-100
              dark:hover:bg-gray-800
            "
          >
            Report Community
          </button>
        )}

        {/* Leave — OWNER MUST NOT SEE THIS */}
        {!isOwner && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700" />

            <button
              onClick={onLeave}
              className="
                w-full
                text-left
                px-4
                py-3
                text-red-600
                dark:text-red-400
                hover:bg-red-50
                dark:hover:bg-red-950/30
              "
            >
              Leave Community
            </button>
          </>
        )}
      </div>
    </>
  );
}