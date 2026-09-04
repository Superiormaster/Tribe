import { Pin } from "lucide-react";
import { formatChatTime } from "@/utils/inbox/formatChatTime";
import { getOfflinePreview, getPreviewData } from "@/utils/inbox/preview";
import { getDisplayData } from "@/utils/inbox/display";

import {
  Clock3,
  Check,
  CheckCheck,
  AlertCircle,
  Image as ImageIcon,
  Video,
  Images,
  Mic,
  FileImage,
  Sticker,
  AtSign,
} from "lucide-react";

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
  
  const PreviewIcon = ({
    type,
    className = "text-gray-400",
  }: {
    type: string | null;
    className?: string;
  }) => {
    if (!type) return null;
  
    const props = {
      size: 15,
      strokeWidth: 2,
      className: `shrink-0 ${className}`,
    };
  
    switch (type) {
      case "image":
        return <ImageIcon {...props} />;
  
      case "video":
        return <Video {...props} />;
  
      case "gallery":
        return <Images {...props} />;
  
      case "audio":
        return <Mic {...props} />;
  
      case "gif":
        return <FileImage {...props} />;
  
      case "sticker":
        return <Sticker {...props} />;
  
      default:
        return null;
    }
  };

  const {
    displayTime,
    showingDraft,
    showingPending,
  } = getDisplayData(chat, draft, pending);

  const isCommunity =
    chat.chat_type === "community" ||
    !!chat.community_id ||
    !!chat.communityId;
  
  const title = isCommunity
    ? (
        chat.community_name ??
        pending?.community_name ??
        pending?.name ??
        "Community"
      )
    : chat.username;

  const senderName = isCommunity
    ? (
        preview.sender ??
        chat.sender_username ??
        chat.username ??
        "Unknown"
      )
    : preview.sender;
  
  return (
    <div className="flex-1 min-w-0 space-y-2">
      
      {/* CHAT / COMMUNITY NAME */}
      <div className="flex items-center justify-between">
        <p className="text-gray-700 dark:text-white font-semibold truncate">
          {title ?? "Unknown"}
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

      {/* LAST MESSAGE */}
      <div className="flex items-center justify-between mt-1 gap-2">
        {showingDraft ? (
          <p className="text-sm text-gray-500 truncate">
            <span className="text-yellow-500 mr-1">
              Draft:
            </span>
        
            {draft?.text}
          </p>
        ) : showingPending ? (
          (() => {
            const offlinePreview =
              getOfflinePreview(pending);
        
            return (
              <div className="flex items-center min-w-0 flex-1 text-sm text-yellow-500">
                
                {offlinePreview.icon && (
                  <span className="mr-1 shrink-0 inline-flex">
                    <PreviewIcon
                      type={offlinePreview.icon}
                      className="text-yellow-500"
                    />
                  </span>
                )}
        
                <span className="truncate">
                  {offlinePreview.text}
                </span>
        
              </div>
            );
          })()
        ) : (
          <div className="flex items-center min-w-0 flex-1 text-sm text-gray-500">
            
            {/* MESSAGE STATUS */}
            {preview.isMine && (
              <span className="mr-1 inline-flex items-center shrink-0">
                {(() => {
                  switch (preview.status) {
                    case "pending":
                    case "sending":
                      return (
                        <Clock3
                          size={14}
                          className="text-gray-400"
                        />
                      );
        
                    case "sent":
                      return (
                        <Check
                          size={14}
                          className="text-gray-400"
                        />
                      );
        
                    case "delivered":
                      return (
                        <CheckCheck
                          size={14}
                          className="text-gray-400"
                        />
                      );
        
                    case "seen":
                      return (
                        <CheckCheck
                          size={14}
                          className="text-indigo-400 dark:text-indigo-600"
                        />
                      );
        
                    case "failed":
                      return (
                        <AlertCircle
                          size={14}
                          className="text-red-500"
                        />
                      );
        
                    default:
                      return null;
                  }
                })()}
              </span>
            )}
        
            {/* MENTION */}
            {preview.mentioned && (
              <span className="mr-1 inline-flex items-center shrink-0">
                <AtSign
                  size={16}
                  strokeWidth={3}
                  className="text-indigo-500"
                />
              </span>
            )}
        
            {/* MESSAGE TEXT */}
            <span className="min-w-0 truncate">
              
              <span className="mr-1">
                {senderName}:
              </span>
        
              {/* MEDIA ICON */}
              {preview.previewIcon && (
                <span className="inline-flex items-center mr-1 align-middle">
                  <PreviewIcon
                    type={preview.previewIcon}
                  />
                </span>
              )}
        
              {/* TEXT */}
              <span>
                {preview.text}
              </span>
        
            </span>
          </div>
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