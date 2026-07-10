'use client';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
  isOwner: boolean;
  canLeave: boolean;
  onLeave: () => void;
  onSettings: () => void;
  onApproved: () => void;
  onRejected: () => void;
  onJoinRequests: () => void;
};

export default function CommunityMenuModal({
  isOpen,
  onClose,
  canManage,
  isOwner,
  onLeave,
  canLeave,
  onSettings,
  onApproved,
  onRejected,
  onJoinRequests,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex">

      <div className="w-full mt-20 bg-white dark:bg-gray-900 rounded-t-2xl p-4 space-y-3">

        <button
          onClick={onClose}
          className="text-gray-500"
        >
          Close
        </button>

        {isOwner && (
          <button
            onClick={onSettings}
            className="w-full text-gray-700 dark:text-gray-200 text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ⚙️ Settings
          </button>
        )}

        {canManage && (
          <button
            onClick={onJoinRequests}
            className="w-full text-gray-700 dark:text-gray-200 text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            👥 Join Requests
          </button>
        )}

        {canLeave && (
          <button
            onClick={onLeave}
            className="w-full text-left p-3 rounded-lg text-red-500"
          >
            🚪 Leave Community
          </button>
        )}

        <button 
          onClick={onApproved}
          className="w-full text-gray-700 dark:text-gray-200 text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          🟢 Approved Posts
        </button>

        <button 
          onClick={onRejected}
          className="w-full text-gray-700 dark:text-gray-200 text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          🔴 Rejected Posts
        </button>

      </div>
    </div>
  );
}