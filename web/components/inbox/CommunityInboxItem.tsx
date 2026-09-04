import InboxChatBubble from "./InboxChatBubble";
import type { CommunityChatMeta } from "@/hooks/communityInbox/useCommunityPendingMessages";

interface Props {
  chat: any;
  draft: any;
  pending: any;
  selected: boolean;
  chatMeta?: CommunityChatMeta;
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

  const communityCover =
    chat.cover_image_url ??
    chat.community_cover_image_url ??
    chat.community_cover ??
    chat.cover_image ??
    pending?.cover_image_url ??
    chatMeta?.cover_image_url ??
    null;

  const communityName =
    chat.community_name ??
    pending?.community_name ??
    pending?.name ??
    draft?.community_name ??
    draft?.name ??
    chatMeta?.communityName ??
    "Unknown Community";

  const communityChat = {
    ...chat,

    chat_type: "community",

    community_id:
      chat.community_id ??
      pending?.community_id,

    community_name:
      communityName,

    cover_image_url:
      communityCover,
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

      {communityCover ? (
        <img
          src={communityCover}
          alt={communityName}
          className="w-12 h-12 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold shrink-0">
          {communityName
            .slice(0, 2)
            .toUpperCase()}
        </div>
      )}

      <InboxChatBubble
        chat={communityChat}
        draft={draft}
        pending={pending}
        currentUserId={currentUserId}
      />

    </div>
  );
}