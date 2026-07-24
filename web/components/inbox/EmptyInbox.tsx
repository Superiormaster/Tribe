'use client';

import AppLink from '@/components/AppLink';
import { MessageCircle, Users } from 'lucide-react';

interface EmptyInboxProps {
  openConnectionsPanel: () => void | Promise<void>;
}

export default function EmptyInbox({
  openConnectionsPanel,
}: EmptyInboxProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-24 text-center">
      <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
        <MessageCircle
          size={42}
          className="text-indigo-600"
        />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        No messages yet
      </h2>

      <p className="mt-3 max-w-sm text-gray-500 dark:text-gray-400">
        Start a conversation with your connections.
        Once someone sends a message, your chats will
        appear here.
      </p>

      <AppLink
        href="/main/discover"
        prefetch={false}
        className="
          mt-8
          inline-flex
          items-center
          gap-2
          px-5
          py-3
          rounded-lg
          bg-indigo-600
          text-white
          hover:bg-indigo-700
          transition
        "
      >
        <Users size={18} />
        Find People
      </AppLink>
    </div>
  );
}