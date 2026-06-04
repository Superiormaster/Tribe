'use client';

import MessageBubbles from '@/components/MessageBubbles';

type Props = {
  messages: any[];
  currentUser: {
    id: number | null;
    username: string;
  };

  showDrawer: boolean;
  setShowDrawer: (value: boolean) => void;
  setDrawerMode: (
    mode: 'plus' | 'emoji' | null
  ) => void;

  page: number;
  hasMore: boolean;

  loadMore: () => void;

  selectionMode: boolean;
  selectedMessages: Set<string>;

  resendMessage: (message: any) => void;

  toggleSelectMessage: (
    id: string | number
  ) => void;

  clearSelection: () => void;

  replyingTo: any;
  setReplyingTo: (message: any | null) => void;

  onReaction: (
    messageId: number,
    emoji: string
  ) => void;
};

export default function ChatBody({
  messages,
  currentUser,

  showDrawer,
  setShowDrawer,
  setDrawerMode,

  page,
  hasMore,
  loadMore,

  selectionMode,
  selectedMessages,

  resendMessage,

  toggleSelectMessage,
  clearSelection,

  replyingTo,
  setReplyingTo,

  onReaction,
}: Props) {
 
  return (
    <div
      className={`
        flex-1
        min-h-0
        transition-all
        duration-300
        ${
          showDrawer
            ? 'pb-[420px]'
            : 'pb-[72px]'
        }
      `}
    >
      <MessageBubbles
        messages={messages}
        currentUser={currentUser.username}
        currentUserId={currentUser.id}

        loadMore={loadMore}

        onOpenDrawer={(mode) => {
          setDrawerMode(mode);
          setShowDrawer(true);
        }}

        selectionMode={selectionMode}
        selectedMessages={selectedMessages}

        resendMessage={resendMessage}

        toggleSelectMessage={
          toggleSelectMessage
        }

        clearSelection={clearSelection}

        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}

        onReply={setReplyingTo}

        hasMore={hasMore}

        onReaction={onReaction}
      />
    </div>
  );
}