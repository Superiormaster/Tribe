import {
  getDB,
  MESSAGE_STORE,
  COMMUNITY_DRAFT_STORE,
  COMMUNITY_STORE,
  CHAT_READ,
  resetDatabase
} from "./db";
import type { Message } from "@/utils/chat/messageContract";

// --------------------
// MESSAGES
// --------------------
export async function saveCommunityMessage(msg: Message, ownerId?: number) {
  const db = await getDB();
  if (!db) return;
  
  const effectiveOwnerId =
    Number(msg.ownerId ?? ownerId);
  
  const clientId =
    msg.client_id ?? `server-${msg.id}`;
  
  const accountMessageKey =
    `${effectiveOwnerId}:${clientId}`;

  const clean = {
    ...msg,
    client_id: clientId,

    ownerId: effectiveOwnerId,
  
    account_message_key:
      accountMessageKey,

    hidden_for: msg.hidden_for || [],
    is_deleted: msg.is_deleted || false,

    reactions: msg.reactions || [],

    files: (msg.files || []).map((file: any) => ({
      blob: file.blob ?? file,
      name: file.name,
      type: file.type,
      size: file.size,
      media_url: file.media_url,
      thumbnail: file.thumbnail,
      duration: file.duration,
    })),
  };

  await db.put(MESSAGE_STORE, {
    ...clean,
      chat_type: "community",
  });
}

function normalizeMessageFiles(
  msg: any,
  existing?: any
) {
  const incomingFiles = Array.isArray(msg.files)
    ? msg.files
    : [];

  const existingFiles = Array.isArray(existing?.files)
    ? existing.files
    : [];

  const mediaAssets = Array.isArray(msg.media_assets)
    ? msg.media_assets
    : Array.isArray(existing?.media_assets)
      ? existing.media_assets
      : [];

  const hasUsableFile = (file: any) =>
    !!file?.blob ||
    !!file?.media_url ||
    !!file?.preview;

  // 1. Incoming local files with actual content
  const usableIncomingFiles =
    incomingFiles.filter(hasUsableFile);

  if (usableIncomingFiles.length > 0) {
    return usableIncomingFiles.map((file: any) => ({
      blob: file?.blob ?? null,

      name: file?.name ?? null,

      type:
        file?.type ??
        file?.content_type ??
        file?.media_type ??
        "image",

      size: file?.size ?? null,

      media_url:
        file?.media_url ??
        file?.preview ??
        file?.original_url ??
        file?.url ??
        null,

      thumbnail:
        file?.thumbnail ??
        file?.thumbnail_url ??
        null,

      duration:
        file?.duration ?? null,

      media_id:
        file?.media_id ?? null,

      media_type:
        file?.media_type ?? null,
    }));
  }

  // 2. Existing local files with actual content
  const usableExistingFiles =
    existingFiles.filter(hasUsableFile);

  if (usableExistingFiles.length > 0) {
    return usableExistingFiles;
  }

  // 3. Backend MediaAsset objects
  if (mediaAssets.length > 0) {
    return mediaAssets.map((asset: any) => ({
      blob: asset?.blob ?? null,

      name:
        asset?.name ??
        asset?.filename ??
        null,

      type:
        asset?.content_type ??
        asset?.type ??
        asset?.media_type ??
        "image",

      size:
        asset?.size ?? null,

      media_url:
        Array.isArray(asset?.original_url)
          ? asset.original_url[0] ?? null
          : asset?.original_url ??
            asset?.media_url ??
            asset?.url ??
            null,

      thumbnail:
        Array.isArray(asset?.thumbnail_url)
          ? asset.thumbnail_url[0] ?? null
          : asset?.thumbnail_url ??
            asset?.thumbnail ??
            null,

      duration:
        asset?.duration ?? null,

      media_id:
        asset?.media_id ?? null,

      media_type:
        asset?.media_type ?? null,
    }));
  }

  // 4. External media
  const externalUrls =
    Array.isArray(msg.external_media_urls)
      ? msg.external_media_urls
      : [];

  if (externalUrls.length > 0) {
    return externalUrls.map((url: string) => ({
      blob: null,
      name: null,
      type: msg.media_type ?? "image",
      size: null,
      media_url: url,
      thumbnail: null,
      duration: null,
      media_id: null,
      media_type: msg.media_type ?? null,
    }));
  }

  return [];
}

export async function saveCommunityMessages(
  messages: Message[],
  ownerId?: number
) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  if (
    ownerId === undefined ||
    ownerId === null ||
    !Number.isFinite(Number(ownerId))
  ) {
    console.error(
      "❌ [IDB SAVE] INVALID OWNER ID:",
      ownerId
    );
    return;
  }

  const effectiveOwnerId = Number(ownerId);
  const db = await getDB();

  if (!db) {
    console.error(
      "❌ [IDB SAVE] IndexedDB unavailable"
    );
    return;
  }

  console.log(
    `💾 [IDB SAVE] Saving ${messages.length} messages for owner ${effectiveOwnerId}`
  );

  for (const msg of messages) {
    try {
      const clientId =
        msg.client_id ??
        (msg.id != null
          ? `server-${msg.id}`
          : crypto.randomUUID());

      const accountMessageKey =
        `${effectiveOwnerId}:${clientId}`;

      const existing =
        await db.get(
          MESSAGE_STORE,
          accountMessageKey
        );

      const isOwnExisting =
        !!existing &&
        Number(existing.sender) ===
          effectiveOwnerId;

      const replyTo =
        msg.reply_to !== undefined &&
        msg.reply_to !== null
          ? msg.reply_to
          : existing?.reply_to ?? null;

      const replyToId =
        msg.reply_to_id !== undefined &&
        msg.reply_to_id !== null
          ? msg.reply_to_id
          : existing?.reply_to_id ??
            null;

      const replyToClientId =
        msg.reply_to_client_id !== undefined &&
        msg.reply_to_client_id !== null
          ? msg.reply_to_client_id
          : existing?.reply_to_client_id ??
            null;

      const files = normalizeMessageFiles(
        msg,
        existing
      );
  
      const mediaAssets =
        Array.isArray((msg as any).media_assets)
          ? (msg as any).media_assets
          : Array.isArray(existing?.media_assets)
            ? existing.media_assets
            : [];
      
      const normalizedMediaUrl =
        Array.isArray(msg.media_url) &&
        msg.media_url.length > 0
          ? msg.media_url
          : mediaAssets.flatMap((asset: any) => {
              const url =
                asset?.original_url ??
                asset?.media_url ??
                asset?.url;
      
              if (Array.isArray(url)) {
                return url;
              }
      
              return url
                ? [url]
                : [];
            });
  
      const normalizedThumbnail =
        Array.isArray(msg.thumbnail) &&
        msg.thumbnail.length > 0
          ? msg.thumbnail.flat()
          : mediaAssets
              .flatMap((asset: any) => {
                const thumbnail = asset?.thumbnail_url;
      
                if (Array.isArray(thumbnail)) {
                  return thumbnail;
                }
      
                return thumbnail
                  ? [thumbnail]
                  : [];
              });
      
      const normalizedDuration =
        Array.isArray(msg.duration) &&
        msg.duration.length > 0
          ? msg.duration
          : mediaAssets
              .map((asset: any) => asset?.duration)
              .filter(
                (duration: any) =>
                  duration !== null &&
                  duration !== undefined
              );
    
      const isOwnMessage =
        Number(msg.sender) === effectiveOwnerId;
      
      const authoritativeCreatedAt =
        isOwnMessage
          ? (
              msg.client_created_at ??
              existing?.client_created_at ??
              existing?.created_at ??
              msg.created_at
            )
          : (
              msg.created_at ??
              existing?.created_at
            );

      const record = {
        ...(existing ?? {}),
        ...msg,

        account_message_key:
          accountMessageKey,

        client_id:
          clientId,

        ownerId:
          existing?.ownerId ??
          msg.ownerId ??
          effectiveOwnerId,

        id:
          msg.id ??
          existing?.id ??
          msg.server_id ??
          existing?.server_id,
  
        server_id:
          msg.server_id ??
          msg.id ??
          existing?.server_id ??
          existing?.id,

        chat_type:
          (msg as any).chat_type ??
          existing?.chat_type ??
          "community",

        hidden_for:
          msg.hidden_for ??
          existing?.hidden_for ??
          [],

        is_deleted:
          msg.is_deleted ??
          existing?.is_deleted ??
          false,

        reactions:
          msg.reactions ??
          existing?.reactions ??
          [],

        reply_to:
          replyTo,

        reply_to_id:
          replyToId,

        reply_to_client_id:
          replyToClientId,

        created_at:
          authoritativeCreatedAt,

        server_created_at:
          (msg as any).server_created_at ??
          (
            isOwnMessage
              ? existing?.server_created_at ??
                msg.created_at
              : msg.created_at
          ),
      
        client_created_at:
          msg.client_created_at ??
          existing?.client_created_at ??
          null,

        client_sequence:
          existing?.client_sequence ??
          msg.client_sequence,

        files:
          files.map((file: any) => ({
            blob:
              file?.blob ?? file,

            name:
              file?.name,

            type:
              file?.type,

            size:
              file?.size,

            media_url:
              file?.media_url,

            thumbnail:
              file?.thumbnail,

            duration:
              file?.duration,
          })),

        media_assets:
          (msg as any).media_assets ??
          existing?.media_assets ??
          [],

        media_url:
          normalizedMediaUrl,

        thumbnail:
          normalizedThumbnail,
      
        duration:
          normalizedDuration,
      };

      console.log(
        "📝 [IDB SAVE] WRITING:",
        {
          key: accountMessageKey,
          id: record.id,
          server_id: record.server_id,
          client_id: record.client_id,
          chat: record.chat,
          ownerId: record.ownerId,
          media_type: record.media_type,
          media_assets:
            record.media_assets?.length,
          media_url:
            record.media_url?.length,
          files:
            record.files?.length,
          reply_to:
            record.reply_to,
        }
      );
  
      await db.put(
        MESSAGE_STORE,
        record
      );

      const saved =
        await db.get(
          MESSAGE_STORE,
          accountMessageKey
        );

      console.log(
        "🔄 [IDB SAVE] READ BACK:",
        {
          found:
            !!saved,

          key:
            saved?.account_message_key,

          id:
            saved?.id,

          server_id:
            saved?.server_id,

          client_id:
            saved?.client_id,

          media_type:
            saved?.media_type,

          media_url: saved?.media_url,
          thumbnail: saved?.thumbnail,
          media_assets: saved?.media_assets,

          files:
            saved?.files?.length,

          reply_to:
            saved?.reply_to,
        }
      );

      if (!saved) {
        console.error(
          "🚨 [IDB SAVE] WRITE FAILED — RECORD NOT FOUND AFTER PUT",
          {
            accountMessageKey,
            id: record.id,
            client_id: record.client_id,
          }
        );
      }
    } catch (error) {
      console.error(
        "❌ [IDB SAVE] Failed to save message:",
        {
          id: msg.id,
          client_id: msg.client_id,
          error,
        }
      );
    }
  }

  console.log(
    "✅ [IDB SAVE] COMPLETE"
  );
}

export const isHiddenForUser = (
  msg: any,
  userId: number
) => {
  return (
    Array.isArray(msg.hidden_for) &&
    msg.hidden_for.includes(userId)
  );
};

export async function getCommunityMessagesByChat(communityId: number, ownerId: number) {
  const db = await getDB();
  if (!db) return [];

  const messages = await db.getAllFromIndex(
    MESSAGE_STORE,
    "by_chat_owner",
    [communityId, ownerId, "community"]
  );

  return messages.filter(
    (m: any) =>
      m.chat_type === "community" &&
      !isHiddenForUser(m, ownerId)
  );
}

export async function getCommunityMessage(
    communityId: number,
    ownerId: number,
    messageId: number
) {
    const db = await getDB();

    if (!db) return null;

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_community_owner_id");

    return index.get([
        communityId,
        ownerId,
        "community",
        messageId,
    ]);
}

export async function getCommunityLatestMessages(
  communityId: number,
  ownerId: number,
  limit = 50
) {
  const db = await getDB();

  if (!db) return [];

  const index = db
    .transaction(MESSAGE_STORE)
    .store
    .index("by_community_owner_id");

  let cursor = await index.openCursor(
    IDBKeyRange.bound(
      [
        communityId,
        ownerId,
        "community",
        0,
      ],
      [
        communityId,
        ownerId,
        "community",
        Number.MAX_SAFE_INTEGER,
      ]
    ),
    "prev"
  );

  const result: any[] = [];

  while (
    cursor &&
    result.length < limit
  ) {
    result.push(cursor.value);

    cursor = await cursor.continue();
  }

  return result.reverse();
}

export async function getCommunityMessagesBefore(
    communityId: number,
    ownerId: number,
    anchorId: number,
    limit = 25
) {
    const db = await getDB();

    if (!db) return [];

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_community_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.bound(
            [communityId, ownerId, "community", 0],
            [communityId, ownerId, "community", anchorId],
            false,
            true
        ),
        "prev"
    );

    const result = [];

    while (cursor && result.length < limit) {
        if (cursor.value.chat_type === "community") {
            result.push(cursor.value);
        }
    
        cursor = await cursor.continue();
    }

    return result.reverse();
}

export async function getCommunityMessagesAfter(
  communityId: number,
  ownerId: number,
  anchorId: number,
  limit = 25
) {
  const db = await getDB();

  if (!db) return [];

  const index =
    db
      .transaction(MESSAGE_STORE)
      .store
      .index("by_community_owner_id");

  let cursor =
    await index.openCursor(
      IDBKeyRange.lowerBound(
        [
          communityId,
          ownerId,
          "community",
          anchorId,
        ],
        true
      )
    );

  const result: any[] = [];

  while (
    cursor &&
    result.length < limit
  ) {

    if (
      cursor.value.chat_type ===
      "community"
    ) {
      result.push(
        cursor.value
      );
    }

    cursor =
      await cursor.continue();
  }

  return result;
}

export async function getCommunityMessagesWindow(
    communityId: number,
    ownerId: number,
    anchorId: number,
    before = 25,
    after = 25
) {
    const [
        older,
        newer,
        anchor,
    ] = await Promise.all([
        getCommunityMessagesBefore(
            communityId,
            ownerId,
            anchorId,
            before
        ),
        getCommunityMessagesAfter(
            communityId,
            ownerId,
            anchorId,
            after
        ),
        getCommunityMessage(
            communityId,
            ownerId,
            anchorId
        ),
    ]);

    return [
        ...older,
        ...(anchor ? [anchor] : []),
        ...newer,
    ];
}

export function deleteCommunityMessagesOutsideWindow(
    messages: Message[],
    anchorId: number,
    keepBefore = 40,
    keepAfter = 40
) {
    const anchorIndex = messages.findIndex(
        m => m.id === anchorId
    );

    if (anchorIndex === -1) {
        return messages;
    }

    const start = Math.max(
        0,
        anchorIndex - keepBefore
    );

    const end = Math.min(
        messages.length,
        anchorIndex + keepAfter + 1
    );

    return messages.slice(start, end);
}

export async function updateCommunityMessage(
  client_id: string,
  ownerId: number,
  patch: any
) {
  const db = await getDB();
  if (!db) return;
  
  const accountMessageKey =
    `${ownerId}:${client_id}`;

  const msg = await db.get(
    MESSAGE_STORE,
    accountMessageKey
  );

  if (!msg) return;

  // ACCOUNT PROTECTION
  if (msg.ownerId !== ownerId) {
    return;
  }
  
  const normalizedPatch = {
    ...patch,
  
    ...(patch.media_url !== undefined && {
      media_url: Array.isArray(patch.media_url)
        ? patch.media_url
        : patch.media_url
          ? [patch.media_url]
          : [],
    }),
  
    hidden_for:
      patch.hidden_for ??
      msg.hidden_for ??
      [],
  
    is_deleted:
      patch.is_deleted ??
      msg.is_deleted ??
      false,
  
    ...(patch.thumbnail !== undefined && {
      thumbnail: Array.isArray(patch.thumbnail)
        ? patch.thumbnail
        : patch.thumbnail
          ? [patch.thumbnail]
          : [],
    }),
  
    ...(patch.duration !== undefined && {
      duration: Array.isArray(patch.duration)
        ? patch.duration
        : patch.duration != null
          ? [patch.duration]
          : [],
    }),
  };
  
  await db.put(MESSAGE_STORE, {
    ...msg,
    ...normalizedPatch,
    account_message_key:
      accountMessageKey,
  });
}

export async function syncCommunityServerMessage(
  client_id: string,
  ownerId: number,
  server: Partial<Message>
) {
  const db = await getDB();

  if (!db) return;

  const effectiveOwnerId = Number(ownerId);

  const accountMessageKey =
    `${effectiveOwnerId}:${client_id}`;

  const local = await db.get(
    MESSAGE_STORE,
    accountMessageKey
  );

  if (!local) {
    console.warn(
      "[COMMUNITY SYNC] Local message not found:",
      {
        client_id,
        ownerId: effectiveOwnerId,
        accountMessageKey,
      }
    );

    return;
  }

  if (
    Number(local.ownerId) !==
    effectiveOwnerId
  ) {
    console.warn(
      "[PRIVATE SYNC] Owner mismatch:",
      {
        client_id,
        localOwnerId: local.ownerId,
        ownerId: effectiveOwnerId,
      }
    );

    return;
  }

  const isOwnMessage =
    Number(local.sender) ===
    effectiveOwnerId;

  const clientCreatedAt =
    local.client_created_at ??
    server.client_created_at ??
    null;
  
  const serverCreatedAt =
    server.created_at ??
    local.server_created_at ??
    null;

  const merged = {
    ...local,

    ...server,

    // Identity
    client_id,

    server_id:
      server.server_id ??
      server.id ??
      local.server_id,

    account_message_key:
      accountMessageKey,

    ownerId:
      effectiveOwnerId,

    created_at:
      isOwnMessage
        ? (
            clientCreatedAt ??
            local.created_at ??
            serverCreatedAt
          )
        : (
            serverCreatedAt ??
            local.created_at
          ),

    server_created_at:
      serverCreatedAt,

    client_created_at: clientCreatedAt,

    client_sequence:
      local.client_sequence ??
      server.client_sequence,

    chat_type:
      local.chat_type ??
      (server as any).chat_type ??
      "community",

    status:
      server.status ??
      "sent",

    retryable:
      false,
  };

  await db.put(
    MESSAGE_STORE,
    merged
  );

  console.log(
    "✅ [COMMUNITY SYNC] SERVER ACK SAVED TO IDB:",
    {
      accountMessageKey,
      client_id,

      isOwnMessage,
      serverCreatedAt,

      finalCreatedAt:
        merged.created_at,

      client_created_at:
        merged.client_created_at,

      server_created_at:
        merged.server_created_at,

      localId:
        local.id,

      serverId:
        merged.server_id,

      status:
        merged.status,
    }
  );

  return merged;
}

export async function getCommunityPendingMessages(
  ownerId: number
) {
  const db = await getDB();
  if (!db) return [];

  const all = await db.getAll(MESSAGE_STORE);

  const pending = all.filter(
      (m: any) =>
          m.ownerId === ownerId &&
          m.chat_type === "community" &&
          !m.server_id &&
          !m.is_deleted &&
          !isHiddenForUser(m, ownerId) &&
          (
              m.status === "pending" ||
              (
                m.status === "failed" &&
                m.retryable === true
              ) ||
              m.status === "uploading" ||
              m.status === "sending"
          )
  );
  
  console.log(
    "[getCommunityPendingMessages]",
    pending.map((m: any) => ({
      client_id: m.client_id,
      status: m.status,
      media_type: m.media_type,
      media_url: m.media_url,
      files:
        m.files?.map((f: any) => ({
          name: f.name,
          type: f.type,
          hasBlob: !!f.blob,
          blobType: f.blob?.type,
          thumbnail: f.thumbnail,
          duration: f.duration,
          media_url: f.media_url,
        })) || [],
    }))
  );
  
  return pending;
}

export async function deleteCommunityChatData(
  communityId: number,
  ownerId: number
) {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction(
    ["messages", "drafts"],
    "readwrite"
  );

  const messageStore =
    tx.objectStore("messages");

  const draftStore =
    tx.objectStore("drafts");

  const messages =
    await messageStore
      .index("by_chat_owner")
      .getAll([communityId, ownerId, "community"]);

  for (const msg of messages) {
    await messageStore.delete(msg.client_id);
  }

  await draftStore.delete(communityId);

  await tx.done;
}

// SAVE DRAFT
export const saveCommunityDraft = async ({
  communityId,
  text,
  updated_at,
}: {
  communityId: number;
  text: string;
  updated_at?: string;
}) => {
  if (
    communityId === undefined ||
    communityId === null ||
    Number.isNaN(communityId)
  ) {
    console.error(
      "Invalid communityId",
      communityId
    );
    return;
  }

  const db = await getDB();
  if (!db) return;

  await db.put(COMMUNITY_DRAFT_STORE, {
    communityId,
    text,
    updated_at:
      updated_at ||
      new Date().toISOString(),
  });
};

// GET DRAFT
export const getCommunityDraft = async (
  communityId: number
) => {

  const db = await getDB();

  if (!db) return null;

  return db.get(
    COMMUNITY_DRAFT_STORE,
    communityId
  );
};

// DELETE DRAFT
export const deleteCommunityDraft = async (
  communityId: number
) => {

  const db = await getDB();

  if (!db) return;

  return db.delete(
    COMMUNITY_DRAFT_STORE,
    communityId
  );
};

// GET ALL DRAFTS
export const getAllCommunityDrafts = async () => {

  const db = await getDB();

  if (!db) return [];

  return db.getAll(COMMUNITY_DRAFT_STORE);
};

export async function saveCommunityChatScroll({
  communityId,
  userId,
  messageId,
  clientId,
  offset,
}: {
  communityId: number;
  userId: number;
  messageId?: number | string;
  clientId?: number | string;
  offset: number;
}) {
  const db = await getDB();
  if (!db) return;

  return db.put("chat_scroll", {
    id: `${userId}-${communityId}`,
    communityId,
    userId,
    messageId,
    clientId,
    offset,
    updatedAt: Date.now(),
  });
}

export async function getCommunityChatScroll(
  communityId: number,
  userId: number
) {
  const db = await getDB();
  if (!db) return null;

  return db.get(
    "chat_scroll",
    `${userId}-${communityId}`
  );
}

export async function getCommunityMeta(
  communityId: number
) {
  const db = await getDB();
  if (!db) return null;

  return db.get("communities", communityId);
}

export async function getAllCommunityMeta() {
  const db = await getDB();
  if (!db) return [];

  return db.getAll("communities");
}

export async function saveCommunityMeta(
  communityId: number,
  name: string,
  cover_image_url: string | null
) {
  const db = await getDB();
  if (!db) return;

  await db.put("communities", {
    communityId,
    name,
    cover_image_url,
  });
}

export async function saveCommunityRead({
  communityId,
  userId,
  messageId,
  clientId,
}: {
  communityId: number;
  userId: number;
  messageId?: number | string;
  clientId?: number | string;
}) {
  const db = await getDB();
  if (!db) return;

  return db.put(CHAT_READ, {
    id: `${userId}-${communityId}`,
    communityId,
    userId,
    messageId,
    clientId,
    updatedAt: Date.now(),
  });
}

export async function getCommunityRead(
  communityId: number,
  userId: number
) {
  const db = await getDB();
  if (!db) return null;

  return db.get(
    CHAT_READ,
    `${userId}-${communityId}`
  );
}