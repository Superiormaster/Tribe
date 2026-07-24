import InboxChatBubble from "./InboxChatBubble";
import type { ChatMeta } from "@/hooks/inbox/usePendingMessages";

interface Props {
  chat: any;
  draft: any;
  pending: any;
  selected: boolean;
  chatMeta?: ChatMeta;
  bind: any;
  currentUserId: number;
}

export default function CommunityInboxItem({
  chat,
  draft,
  pending,
  selected,
  chatMeta,
  bind,
  currentUserId,
}: Props) {
  return (
    <div
      {...bind}
      className={`flex items-start gap-3 p-3 rounded-lg touch-none cursor-pointer ${
        selected
          ? "bg-blue-100 dark:bg-blue-900"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {chat.cover_image ? (
        <img
          src={chat.cover_image}
          className="w-12 h-12 rounded-full object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
          {chat.community_name.slice(0, 2).toUpperCase()}
        </div>
      )}

      <InboxChatBubble
        chat={chat}
        draft={draft}
        pending={pending}
        currentUserId={currentUserId}
      />
    </div>
  );
}