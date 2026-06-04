'use client';

import EmojiPicker from 'emoji-picker-react';

type Props = {
  onEmojiSelect: (emoji: string) => void;
};

export default function EmojiSection({
  onEmojiSelect,
}: Props) {
  return (
    <div className="h-full overflow-hidden rounded-2xl">
      <EmojiPicker
        theme="dark"
        width="100%"
        height="100%"
        searchDisabled
        skinTonesDisabled
        previewConfig={{
          showPreview: false,
        }}
        onEmojiClick={(emojiData) => {
          onEmojiSelect(emojiData.emoji);
        }}
      />
    </div>
  );
}