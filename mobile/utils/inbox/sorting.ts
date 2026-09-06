export function sortInbox<T extends {
  pinned?: boolean;
  pinned_at?: string | null;
  created_at?: string | null;
}>(
  chats: T[]
): T[] {
  return [...chats].sort((a, b) => {
    // 1. Pinned chats always come first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    if (a.pinned && b.pinned) {
      const aPinned = new Date(a.pinned_at ?? 0).getTime();
      const bPinned = new Date(b.pinned_at ?? 0).getTime();

      return bPinned - aPinned;
    }

    const aTime = new Date(a.created_at ?? 0).getTime();
    const bTime = new Date(b.created_at ?? 0).getTime();

    return bTime - aTime;
  });
}