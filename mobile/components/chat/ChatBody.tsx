'use client';

import React, { forwardRef } from 'react';
import MessageBubbles, { MessageBubblesHandle } from '@/components/MessageBubbles';
import { Message } from "@/utils/chat/messageContract";
import CommunityChatSkeleton from '@/components/Com-Pri-Chat/ChatSkeleton';
import { isRenderableMessage } from "@/utils/chat/isRenderableMessage";

type Props = {
  chatId: number;
  messages: any[];
  currentUser: {
    id: number;
    username: string;
  };

  showDrawer: boolean;
  setShowDrawer: (value: boolean) => void;
  setDrawerMode: (
    mode: 'plus' | 'emoji' | null
  ) => void;
  loadMessageWindow: (
    messageId: number
  ) => Promise<void>;

  page: number;
  hasMore: boolean;
  hasNewer: boolean;
  initializing: boolean;
  loadMore: () => void;
  loadNewer: () => void;
  closeReactionPicker: () => void;

  selectedMessages: Set<string>;

  previewState: {
    files: any[];
    index: number;
    msg: any;
    isMine: boolean;
    onReply?: (msg: Message) => void;
  } | null;

  setPreviewState: React.Dispatch<
    React.SetStateAction<{
      files: any[];
      index: number;
      msg: any;
      isMine: boolean;
      onReply?: (msg: Message) => void;
    } | null>
  >;

  resendPendingMessage: (message: any) => void;
  retryFailedMessage: (message: any) => void;
  resendMedia: (message: any) => void;

  toggleSelectMessage: (
    id: string | number
  ) => void;

  clearSelection: () => void;

  replyingTo: any;
  setReplyingTo: (message: any | null) => void;
  onForward: (messages: Message[]) => void;

  onReaction: (
    messageId: number,
    emoji: string
  ) => void;
};

const ChatBody = forwardRef<
  MessageBubblesHandle,
  Props
>(
  (
    {
      chatId,
      messages,
      currentUser,
      showDrawer,
      setShowDrawer,
      setDrawerMode,
      page,
      hasMore,
      hasNewer,
      loadMore,
      loadNewer,
      closeReactionPicker,
      loadMessageWindow,
      selectedMessages,
      previewState,
      setPreviewState,
      resendPendingMessage,
      retryFailedMessage,
      resendMedia,
      toggleSelectMessage,
      clearSelection,
      replyingTo,
      setReplyingTo,
      initializing,
      onForward,
      onReaction,
    },
    ref
  ) => {
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
        {initializing && messages.length === 0 ? (
          <CommunityChatSkeleton />
        ) : (
          <MessageBubbles
            ref={ref}
            chatId={chatId}
            messages={messages.filter(isRenderableMessage)}
            currentUserId={currentUser.id}
            onCloseReactionPicker={closeReactionPicker}
            loadMore={loadMore}
            loadNewer={loadNewer}
            onOpenDrawer={(mode) => {
              setDrawerMode(mode);
              setShowDrawer(true);
            }}
            loadMessageWindow={loadMessageWindow}
            onForward={onForward}
            selectedMessages={selectedMessages}
            previewState={previewState}
            setPreviewState={setPreviewState}
            resendPendingMessage={
              resendPendingMessage
            }
            retryFailedMessage={
              retryFailedMessage
            }
            resendMedia={resendMedia}
            toggleSelectMessage={
              toggleSelectMessage
            }
            clearSelection={clearSelection}
            replyingTo={replyingTo}
            onReply={setReplyingTo}
            hasMore={hasMore}
            hasNewer={hasNewer}
            onReaction={onReaction}
          />
        )}
      </div>
    );
  }
);

ChatBody.displayName = 'ChatBody';

export default ChatBody;