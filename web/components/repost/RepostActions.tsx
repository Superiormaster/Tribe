'use client';

import { Repeat, MessageCircle } from 'lucide-react';

export default function RepostActions({ onNormal, onQuote }) {
  return (
    <div className="flex flex-col space-y-2">

      {/* NORMAL REPOST */}
      <button
        onClick={onNormal}
        className="flex gap-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700 items-center"
      >
        <Repeat size={18} />
        Repost
      </button>

      {/* QUOTE REPOST */}
      <button
        onClick={onQuote}
        className="flex gap-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 hover:rounded-lg dark:hover:bg-gray-700 items-center"
      >
        <MessageCircle size={18} />
        Quote Repost
      </button>

    </div>
  );
}