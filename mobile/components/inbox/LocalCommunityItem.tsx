import InboxChatBubble from "./InboxChatBubble";

interface Props {
  chatId: number;
  draft: any;
  pending: any;
  chatMeta: any;
  selected: boolean;
  bind: any;
  currentUserId: number;
}

export default function LocalCommunityItem({
  chatId,
  draft,
  pending,
  chatMeta,
  selected,
  bind,
  currentUserId,
}: Props) {
  const chat = {
    chat_id: chatId,
    community_name:
      pending?.community_name ||
      pending?.name ||
      chatMeta?.name ||
      "Unknown Community",

    cover_image_url:
      pending?.cover_image_url ||
      chatMeta?.cover_image_url,

    unseen: 0,
    pinned: false,

    created_at:
      pending?.created_at ||
      draft?.updated_at,
  };

  return (
    <div
      {...bind}
      className={`flex items-start gap-3 p-3 rounded-lg touch-none cursor-pointer ${
        selected
          ? "bg-blue-100 dark:bg-blue-900"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {chat.cover_image_url ? (
        <img
          src={chat.cover_image_url}
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