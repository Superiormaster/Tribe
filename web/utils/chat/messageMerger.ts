export const getMessageKey = (m: any) => {
  return m.server_id
    ? `server-${m.server_id}`
    : `client-${m.client_id}`;
};

export function sortMessages(msgs: any[]) {
  return [...msgs].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );
}

export function mergeMessages(
    prev: any[] = [],
    incoming: any[] = []
) {
  prev = Array.isArray(prev) ? prev : [];
  incoming = Array.isArray(incoming) ? incoming : [];

  const map = new Map();

  const all = [...prev, ...incoming];

  for (const m of all) {
    const key = getMessageKey(m);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, m);
      continue;
    }

    // 🧠 SERVER WINS RULE
    const existingIsServer = !!existing.server_id;
    const incomingIsServer = !!m.server_id;

    if (incomingIsServer && !existingIsServer) {
      map.set(key, m);
      continue;
    }

    if (existingIsServer && !incomingIsServer) {
      continue;
    }

    // 🧠 BOTH SAME TYPE → KEEP MOST RECENT
    const existingTime = new Date(existing.created_at).getTime();
    const incomingTime = new Date(m.created_at).getTime();

    if (incomingTime > existingTime) {
      map.set(key, {
        ...existing,
        ...m,

        // 🧠 preserve upload progress if still local
        upload_progress:
          existing.upload_progress > m.upload_progress
            ? existing.upload_progress
            : m.upload_progress,
      });
    }
  }

  return sortMessages(Array.from(map.values()));
}

export function sortMessagesWithPins(msgs) {
  return msgs.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    return new Date(a.created_at) - new Date(b.created_at);
  });
}

export function inferMediaType(msg) {
  if (msg.files?.length) {
    const f = msg.files[0];

    if (f.type?.startsWith("video")) return "video";
    if (f.type?.startsWith("audio")) return "audio";
    return "image";
  }

  const url=msg.media_url?.[0]
  if(url?.includes(".mp4")) return "video";

  return "text";
}