export function getDisplayData(chat?: any, draft?: any, pending?: any) {
  const draftTime = draft?.updated_at
    ? new Date(draft.updated_at).getTime()
    : 0;

  const pendingTime = pending?.created_at
    ? new Date(pending.created_at).getTime()
    : 0;

  const backendTime = chat?.created_at
    ? new Date(chat.created_at).getTime()
    : 0;

  const newest = Math.max(
    draftTime,
    pendingTime,
    backendTime
  );

  const showingDraft =
    !!draft?.text?.trim() &&
    newest === draftTime;

  const showingPending =
    !!pending &&
    newest === pendingTime;

  return {
    displayTime: showingDraft
      ? draft.updated_at
      : showingPending
        ? pending.created_at
        : chat.created_at,
    showingDraft,
    showingPending,
  };
}