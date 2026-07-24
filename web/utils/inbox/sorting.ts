export function sortInbox<T extends {
  pinned?: boolean;
  pinned_at?: string | null;
  created_at: string;
}>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    if (a.pinned && b.pinned) {
      return (
        new Date(b.pinned_at || 0).getTime() -
        new Date(a.pinned_at || 0).getTime()
      );
    }

    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    );
  });
}