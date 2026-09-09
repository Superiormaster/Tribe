import type { Message } from "@/utils/chat/messageContract";
import { isHiddenForUser } from "@/lib/messageDB";

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
  
  const result: any[] = [];

  const all = [
    ...(Array.isArray(prev) ? prev : []),
    ...(Array.isArray(incoming) ? incoming : []),
  ];

  const findExistingIndex = (message: any) => {
    if (message.server_id != null) {
      const index = result.findIndex(
        existing =>
          existing.server_id != null &&
          Number(existing.server_id) ===
            Number(message.server_id)
      );

      if (index !== -1) {
        return index;
      }
    }

    if (message.id != null) {
      const index = result.findIndex(
        existing =>
          existing.id != null &&
          Number(existing.id) ===
            Number(message.id)
      );

      if (index !== -1) {
        return index;
      }
    }

    if (message.client_id) {
      const index = result.findIndex(
        existing =>
          existing.client_id &&
          existing.client_id ===
            message.client_id
      );

      if (index !== -1) {
        return index;
      }
    }

    if (message.account_message_key) {
      const index = result.findIndex(
        existing =>
          existing.account_message_key &&
          existing.account_message_key ===
            message.account_message_key
      );

      if (index !== -1) {
        return index;
      }
    }

    return -1;
  };

  const mergeTwoMessages = (
    existing: any,
    incomingMessage: any
  ) => {
    const existingIsMine =
      Number(existing.sender) ===
      Number(currentUserId);
  
    const incomingIsMine =
      Number(incomingMessage.sender) ===
      Number(currentUserId);
  
    const resolvedClientId =
      existing.client_id ??
      incomingMessage.client_id;
  
    const resolvedServerId =
      incomingMessage.server_id ??
      incomingMessage.id ??
      existing.server_id ??
      existing.id;
  
    const resolvedId =
      incomingMessage.id ??
      existing.id;
  
    const isDeleted =
      existing.is_deleted === true ||
      incomingMessage.is_deleted === true;
 
    const clientCreatedAt =
      existing.client_created_at ??
      incomingMessage.client_created_at ??
      (
        existingIsMine
          ? existing.created_at
          : incomingIsMine
            ? incomingMessage.created_at
            : undefined
      );
  
    const serverCreatedAt =
      incomingMessage.server_created_at ??
      incomingMessage.created_at ??
      existing.server_created_at;
  
    let createdAt;
  
    if (existingIsMine || incomingIsMine) {
      createdAt =
        clientCreatedAt ??
        existing.created_at ??
        incomingMessage.created_at ??
        serverCreatedAt;
    } else {
      createdAt =
        incomingMessage.created_at ??
        existing.created_at ??
        serverCreatedAt;
    }

    const existingHiddenFor =
      Array.isArray(existing.hidden_for)
        ? existing.hidden_for
        : [];
    
    const incomingHiddenFor =
      Array.isArray(incomingMessage.hidden_for)
        ? incomingMessage.hidden_for
        : [];
    
    const resolvedHiddenFor = Array.from(
      new Set([
        ...existingHiddenFor,
        ...incomingHiddenFor,
      ].map(Number))
    );
  
    const merged = {
      ...existing,
      ...incomingMessage,
  
      id:
        resolvedId,
  
      server_id:
        resolvedServerId,
  
      client_id:
        resolvedClientId,
      hidden_for: resolvedHiddenFor,
  
      account_message_key:
        resolvedClientId
          ? `${Number(currentUserId)}:${resolvedClientId}`
          : (
              existing.account_message_key ??
              incomingMessage.account_message_key
            ),
  
      ownerId:
        existing.ownerId ??
        incomingMessage.ownerId ??
        currentUserId,
  
      created_at:
        createdAt,
  
      client_created_at:
        clientCreatedAt,
  
      server_created_at:
        serverCreatedAt,
  
      client_sequence:
        existing.client_sequence ??
        incomingMessage.client_sequence,
  
      status:
        incomingMessage.status ??
        (
          incomingMessage.server_id != null ||
          incomingMessage.id != null
            ? "sent"
            : existing.status
        ),
  
      retryable:
        incomingMessage.server_id != null ||
        incomingMessage.id != null
          ? false
          : (
              incomingMessage.retryable ??
              existing.retryable
            ),
  
      upload_progress:
        Math.max(
          existing.upload_progress ?? 0,
          incomingMessage.upload_progress ?? 0
        ),
  
      reply_to:
        incomingMessage.reply_to ??
        existing.reply_to,
  
      reply_to_id:
        incomingMessage.reply_to_id ??
        existing.reply_to_id,
  
      reply_to_client_id:
        incomingMessage.reply_to_client_id ??
        existing.reply_to_client_id,
  
      media_assets:
        Array.isArray(incomingMessage.media_assets)
          ? incomingMessage.media_assets
          : (
              Array.isArray(existing.media_assets)
                ? existing.media_assets
                : []
            ),
  
      files:
        Array.isArray(incomingMessage.files)
          ? incomingMessage.files
          : (
              Array.isArray(existing.files)
                ? existing.files
                : []
            ),
  
      reactions:
        Array.isArray(incomingMessage.reactions)
          ? incomingMessage.reactions
          : (
              Array.isArray(existing.reactions)
                ? existing.reactions
                : []
            ),
  
      delivered_to:
        incomingMessage.delivered_to ??
        existing.delivered_to ??
        [],
  
      seen_by:
        incomingMessage.seen_by ??
        existing.seen_by ??
        [],
  
      read_by:
        incomingMessage.read_by ??
        existing.read_by ??
        [],
  
      is_deleted:
        isDeleted,
  
      deleted_by_admin:
        incomingMessage.deleted_by_admin ??
        existing.deleted_by_admin ??
        false,
  
      deleted_at:
        incomingMessage.deleted_at ??
        existing.deleted_at ??
        null,
    };
 
    if (isDeleted) {
      merged.is_deleted = true;
  
      merged.encrypted_text = "";
      merged.caption = "";
  
      merged.media_assets = [];
      merged.media_url = [];
      merged.thumbnail = [];
      merged.duration = [];
      merged.waveform = [];
  
      merged.files = [];
  
      merged.media_type = "text";
      merged.media_source = null;
  
      merged.preview = null;
  
      merged.reply_to = null;
      merged.reply_to_id = null;
      merged.reply_to_client_id = null;
    }
  
    return merged;
  };

  for (const message of all) {
    if (!message) {
      continue;
    }

    const index =
      findExistingIndex(message);

    if (index === -1) {
      result.push(message);
      continue;
    }

    result[index] =
      mergeTwoMessages(
        result[index],
        message
      );
  }

  const visibleMessages = result.filter(
    (message) =>
      !isHiddenForUser(
        message,
        Number(currentUserId)
      )
  );
  
  return sortMessages(
    visibleMessages,
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