export function isMine(message: any, userId: number) {
  return message.sender?.id === userId;
}

export function isSystemMessage(message: any) {
  return message.type === 'system';
}

export function formatReplyPreview(text: string) {
  if (!text) return '';
  return text.length > 60 ? text.slice(0, 60) + '...' : text;
}

export function groupByDay(messages: any[]) {
  const groups: Record<string, any[]> = {};

  for (const msg of messages) {
    const date = new Date(msg.created_at)
      .toDateString();

    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  }

  return groups;
}