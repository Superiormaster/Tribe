import InboxChatBubble from "./InboxChatBubble";

interface Props {
  chat: any;
  draft: any;
  pending: any;
  selected: boolean;
  bind: any;
  currentUserId: any;
}

export default function RecentInboxItem({
  chat,
  draft,
  pending,
  selected,
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
      {chat.avatar ? (
        <img
          src={chat.avatar}
          className="w-12 h-12 rounded-full object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
          {chat.username.slice(0, 2).toUpperCase()}
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