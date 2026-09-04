import type { Message } from "@/utils/chat/messageContract";

export const getMessageKey = (m: any) => {
  if (m.account_message_key) {
    return `account-${m.account_message_key}`;
  }

  if (m.client_id) {
    return `client-${m.client_id}`;
  }

  if (m.server_id != null) {
    return `server-${m.server_id}`;
  }

  if (m.id != null) {
    return `id-${m.id}`;
  }

  return null;
};

export function sortMessages(
  msgs: any[],
  currentUserId?: number
) {
  return [...msgs].sort((a, b) => {

    const aMine =
      Number(a.sender) === Number(currentUserId);

    const bMine =
      Number(b.sender) === Number(currentUserId);

    const aTime = new Date(
      aMine
        ? (
            a.client_created_at ??
            a.created_at ??
            a.server_created_at ??
            0
          )
        : (
            a.created_at ??
            a.server_created_at ??
            a.client_created_at ??
            0
          )
    ).getTime();

    const bTime = new Date(
      bMine
        ? (
            b.client_created_at ??
            b.created_at ??
            b.server_created_at ??
            0
          )
        : (
            b.created_at ??
            b.server_created_at ??
            b.client_created_at ??
            0
          )
    ).getTime();

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    if (
      aMine &&
      bMine &&
      typeof a.client_sequence === "number" &&
      typeof b.client_sequence === "number"
    ) {
      return (
        a.client_sequence -
        b.client_sequence
      );
    }

    // Stable fallback
    return String(
      a.client_id ?? ""
    ).localeCompare(
      String(b.client_id ?? "")
    );
  });
}

export function mergeMessages(
  prev: any[] = [],
  incoming: any[] = [],
  currentUserId?: number
) {
  const map = new Map();

  const all = [
    ...(Array.isArray(prev)
      ? prev
      : []),

    ...(Array.isArray(incoming)
      ? incoming
      : []),
  ];

  for (const m of all) {
    const key =
      getMessageKey(m);

    if (!key) {
      console.warn(
        "⚠️ MESSAGE WITHOUT STABLE IDENTITY:",
        m
      );
      continue;
    }

    const existing =
      map.get(key);

    if (!existing) {
      map.set(key, m);
      continue;
    }

    const existingIsServer =
      !!existing.server_id;

    const incomingIsServer =
      !!m.server_id;

    const existingIsMine =
      Number(existing.sender) ===
      Number(currentUserId);

    const incomingIsMine =
      Number(m.sender) ===
      Number(currentUserId);

    if (
      incomingIsServer &&
      !existingIsServer
    ) {
      map.set(key, {
        ...existing,
        ...m,

        created_at:
          existingIsMine
            ? existing.created_at
            : (
                m.created_at ??
                existing.created_at
              ),

        server_created_at:
          m.server_created_at ??
          m.created_at ??
          existing.server_created_at,

        client_sequence:
          existing.client_sequence ??
          m.client_sequence,

        upload_progress:
          Math.max(
            existing.upload_progress ?? 0,
            m.upload_progress ?? 0
          ),
      });

      continue;
    }

    if (
      existingIsServer &&
      !incomingIsServer
    ) {
      map.set(key, {
        ...existing,
        ...m,

        created_at:
          incomingIsMine
            ? m.created_at
            : (
                existing.created_at ??
                m.created_at
              ),

        server_created_at:
          existing.server_created_at ??
          m.server_created_at,

        client_sequence:
          m.client_sequence ??
          existing.client_sequence,

        upload_progress:
          Math.max(
            existing.upload_progress ?? 0,
            m.upload_progress ?? 0
          ),
      });

      continue;
    }

    const existingTime =
      new Date(
        existing.created_at ?? 0
      ).getTime();

    const incomingTime =
      new Date(
        m.created_at ?? 0
      ).getTime();

    if (
      incomingTime >= existingTime
    ) {
      map.set(key, {
        ...existing,
        ...m,

        created_at:
          existingIsMine
            ? existing.created_at
            : (
                incomingIsMine
                  ? m.created_at
                  : (
                      m.created_at ??
                      existing.created_at
                    )
              ),

        server_created_at:
          m.server_created_at ??
          existing.server_created_at,

        client_sequence:
          existing.client_sequence ??
          m.client_sequence,

        upload_progress:
          Math.max(
            existing.upload_progress ?? 0,
            m.upload_progress ?? 0
          ),
      });
    }
  }

  return sortMessages(
    Array.from(map.values()),
    currentUserId
  );
}

export function inferMediaType(
  msg: Message
) {
  if (msg.files?.length) {
    const f = msg.files[0];

    if (
      f.type?.startsWith("video")
    ) {
      return "video";
    }

    if (
      f.type?.startsWith("audio")
    ) {
      return "audio";
    }

    return "image";
  }

  const url =
    msg.media_url?.[0];

  if (url?.includes(".mp4")) {
    return "video";
  }

  return "text";
}