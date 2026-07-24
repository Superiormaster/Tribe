import { Pin } from "lucide-react";
import { formatChatTime } from "@/utils/inbox/formatChatTime";
import { getOfflinePreview, getPreviewData } from "@/utils/inbox/preview";
import { getDisplayData } from "@/utils/inbox/display";

interface Props {
  chat: any;
  draft: any;
  pending: any;
  currentUserId: number;
}

export default function InboxChatBubble({
  chat,
  draft,
  pending,
  currentUserId,
}: Props) {
  const preview = getPreviewData(chat, currentUserId);
  const {
    displayTime,
    showingDraft,
    showingPending,
  } = getDisplayData(chat, draft, pending);

  return (
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-gray-700 dark:text-white font-semibold truncate">
          {chat.username ?? chat.community_name}
        </p>

        <div className="relative">
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatChatTime(displayTime)}
          </span>

          {chat.pinned && (
            <Pin
              size={12}
              className="absolute -top-3 right-0 text-blue-500 fill-current"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 gap-2">
        {showingDraft ? (
          <p className="text-sm text-gray-500 truncate">
            <span className="text-yellow-500 mr-1">
              Draft:
            </span>
            {draft?.text}
          </p>
        ) : showingPending ? (
          <p className="text-sm text-yellow-500 truncate">
            {getOfflinePreview(pending)}
          </p>
        ) : (
          <p className="text-sm text-gray-500 truncate">
            {preview.isMine && (
              <span
                className={
                  preview.isSeen
                    ? "text-indigo-600 mr-1"
                    : "mr-1"
                }
              >
                {preview.icon}
              </span>
            )}
          
            <span className="mr-1">
              {preview.sender}:
            </span>
          
            {preview.text}
          </p>
        )}

        {(chat.unseen ?? 0) > 0 && (
          <span className="text-xs bg-red-500 text-white px-2 rounded-full shrink-0">
            {chat.unseen}
          </span>
        )}
      </div>
    </div>
  );
}