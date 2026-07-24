'use client';

import React, { forwardRef } from 'react';
import CommunityMessageBubbles from '@/components/communityChat/CommunityMessageBubble';
import { Message } from "@/utils/chat/messageContract";

type Props = {
  communityId: number;
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

  page: number;
  hasMore: boolean;
  hasNewer: boolean;
  loadMore: () => void;
  loadNewer: () => void;

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

const CommunityChatBody = forwardRef<
  HTMLDivElement,
  Props
>(
  (
    {
      communityId,
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
      onForward,
      onReaction,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
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
        <CommunityMessageBubbles
          communityId={communityId}
          messages={messages}
          currentUserId={currentUser.id}
          loadMore={loadMore}
          loadNewer={loadNewer}
          onOpenDrawer={(mode) => {
            setDrawerMode(mode);
            setShowDrawer(true);
          }}
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
      </div>
    );
  }
);

CommunityChatBody.displayName = 'CommunityChatBody';

export default CommunityChatBody;