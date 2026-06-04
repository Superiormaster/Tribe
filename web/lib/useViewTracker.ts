const viewedMap = new Map<number, number>();
const VIEW_COOLDOWN = 10 * 60 * 1000;

export const registerView = (postId: number) => {
  const now = Date.now();
  const last = viewedMap.get(postId);

  if (last && now - last < VIEW_COOLDOWN) return false; 
  viewedMap.set(postId, now);
  return true;
};