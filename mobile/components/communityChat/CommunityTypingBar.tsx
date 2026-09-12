'use client';

type Props = {
  typingUsers: string[];
};

export default function CommunityTypingBar({ typingUsers }: Props) {
  if (!typingUsers?.length) return null;

  return (
    <div className="text-xs text-gray-500 px-3 py-1">
      {typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.length} people are typing...`}
    </div>
  );
}