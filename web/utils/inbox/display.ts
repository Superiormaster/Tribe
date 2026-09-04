export function getDisplayData(
  chat?: any,
  draft?: any,
  pending?: any,
  currentUserId?: number
) {
  const draftTime =
    draft?.updated_at
      ? new Date(draft.updated_at).getTime()
      : 0;

  const pendingIsMine =
    pending &&
    Number(pending.sender) === Number(currentUserId);

  const pendingDisplayTime =
    pendingIsMine
      ? (
          pending.client_created_at ??
          pending.created_at
        )
      : pending?.created_at;

  const pendingTime =
    pendingDisplayTime
      ? new Date(pendingDisplayTime).getTime()
      : 0;

  const chatIsMine =
    Number(chat?.last_message_sender) ===
    Number(currentUserId);

  const chatDisplayTime =
    chatIsMine
      ? (
          chat?.last_message_client_created_at ??
          chat?.display_created_at ??
          chat?.created_at
        )
      : (
          chat?.display_created_at ??
          chat?.created_at
        );

  const serverTime =
    chatDisplayTime
      ? new Date(chatDisplayTime).getTime()
      : 0;

  const newest = Math.max(
    draftTime,
    pendingTime,
    serverTime
  );

  const showingDraft =
    draftTime > 0 &&
    draftTime === newest;

  const showingPending =
    pendingTime > 0 &&
    pendingTime === newest;

  return {
    displayTime:
      showingDraft
        ? draft.updated_at
        : showingPending
          ? pendingDisplayTime
          : chatDisplayTime,

    showingDraft,
    showingPending,
  };
}