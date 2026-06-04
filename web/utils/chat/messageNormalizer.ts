export function normalizeMessage(
  m: any,
  currentUserId: number
) {
  const localId =
    m.localId ||
    m.clientId ||
    m.id?.toString() ||
    crypto.randomUUID();

  return {
    ...m,

    text:
      m.text ||
      m.encrypted_text ||
      m.encrypted ||
      "",

    localId,
    clientId: m.clientId || localId,

    id: m.id ?? null,

    ownerId:
      m.ownerId ??
      currentUserId,

    senderId:
      m.senderId ??
      m.sender?.id ??
      m.sender ??
      currentUserId,

    encrypted_text:
      m.encrypted_text ||
      m.encrypted ||
      "",

    status:
      m.status || "sent",

    reactions:
      m.reactions || [],

    reply_to:
      m.reply_to || null,

    media_url:
      m.media_url || null,

    media_type:
      m.media_type || null,

    created_at:
      m.created_at ||
      new Date().toISOString(),
  };
}