export function getLocalChatIds(
  drafts: Record<number, any>,
  pendingMap: Record<number, any>,
  backendIds: Set<number>,
  recentLoaded: boolean
) {
  if (!recentLoaded) return [];

  return Object.keys({
    ...drafts,
    ...pendingMap,
  })
    .map(Number)
    .filter(chatId => {
      if (backendIds.has(chatId)) {
        return false;
      }

      return drafts[chatId] || pendingMap[chatId];
    });
}