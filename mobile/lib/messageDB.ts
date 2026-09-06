import {
  getDB,
  MESSAGE_STORE,
  POST_DRAFT_STORE,
  CHAT_DRAFT_STORE,
  COMMUNITY_DRAFT_STORE,
  CHAT_STORE,
  CHAT_READ,
  resetDatabase
} from "./db";
import type { Message } from "@/utils/chat/messageContract";

// --------------------
// MESSAGES
// --------------------
export async function saveMessage(msg: Message, ownerId?: number) {
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
      chat_type: "private",
  });
}

export async function deleteMessage(
  clientId: string,
  ownerId: number
) {
  const db = await getDB();
  if (!db) return;

  const accountMessageKey =
    `${Number(ownerId)}:${clientId}`;

  const message = await db.get(
    MESSAGE_STORE,
    accountMessageKey
  );

  if (!message) {
    return;
  }

  // Account protection
  if (
    Number(message.ownerId) !==
    Number(ownerId)
  ) {
    console.warn(
      "[IDB DELETE] Owner mismatch:",
      {
        clientId,
        ownerId,
        messageOwnerId: message.ownerId,
      }
    );

    return;
  }

  await db.delete(
    MESSAGE_STORE,
    accountMessageKey
  );

  console.log(
    "[IDB DELETE] Message deleted:",
    {
      accountMessageKey,
      clientId,
      ownerId,
    }
  );
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
    : [];

  // 1. Local files have highest priority
  if (incomingFiles.length > 0) {
    return incomingFiles.map((file: any) => ({
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

  // 2. Existing local IndexedDB files
  if (existingFiles.length > 0) {
    return existingFiles;
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
        asset?.original_url ??
        asset?.media_url ??
        asset?.url ??
        null,

      thumbnail:
        asset?.thumbnail_url ??
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

  // 4. External media URL
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

export async function saveMessages(
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
  
      const mediaAssets = Array.isArray((msg as any).media_assets)
        ? (msg as any).media_assets
        : Array.isArray(existing?.media_assets)
          ? existing.media_assets
          : [];
  
      const normalizedThumbnail =
        Array.isArray(msg.thumbnail) &&
        msg.thumbnail.length > 0
          ? msg.thumbnail
          : mediaAssets
              .map((asset: any) =>
                asset?.thumbnail_url
              )
              .filter(Boolean);
      
      const normalizedDuration =
        Array.isArray(msg.duration) &&
        msg.duration.length > 0
          ? msg.duration
          : mediaAssets
              .map((asset: any) =>
                asset?.duration
              )
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

        server_id:
          msg.server_id ??
          msg.id ??
          existing?.server_id,

        chat_type:
          (msg as any).chat_type ??
          existing?.chat_type ??
          "private",

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
              ? existing?.server_created_at ?? msg.created_at
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
          msg.media_url ??
          existing?.media_url ??
          [],

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

          media_assets:
            saved?.media_assets?.length,

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

export async function getChatMeta(
  chatId: number
) {
  const db = await getDB();
  if (!db) return null;

  return db.get(CHAT_STORE, chatId);
}

export async function getAllChatMeta() {
  const db = await getDB();
  if (!db) return [];

  return db.getAll(CHAT_STORE);
}

export async function saveChatMeta(
  chatId: number,
  userId: number,
  username: string,
  avatar: string | null
) {
  const db = await getDB();
  if (!db) return;

  await db.put(CHAT_STORE, {
    chatId,
    userId,
    username,
    avatar,
  });
}

export async function getMessagesByChat(chatId: number, ownerId: number) {
  const db = await getDB();
  if (!db) return [];

  const messages = await db.getAllFromIndex(
    MESSAGE_STORE,
    "by_chat_owner",
    [chatId, ownerId, "private"]
  );

  return messages.filter(
    (m: any) =>
      m.chat_type === "private" &&
      !isHiddenForUser(m, ownerId)
  );
}

export async function getMessage(
    chatId: number,
    ownerId: number,
    messageId: number
): Promise<Message | undefined> {
    const db = await getDB();

    if (!db) return undefined;

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");
    console.log(
      "[GET MESSAGE] Looking for:",
      [
        chatId,
        ownerId,
        "private",
        messageId,
      ]
    );
  
    console.log(
      "[GET MESSAGE] Index:",
      index.keyPath
    );

    const result = await index.get([
      chatId,
      ownerId,
      "private",
      messageId,
    ]);
  
    console.log(
      "[GET MESSAGE] RESULT:",
      result
    );
  
    return result ? (result as Message) : undefined;
}

export async function debugGetExactMessage(
  chatId: number,
  ownerId: number,
  chatType: string,
  messageId: number
) {
  const db = await getDB();

  if (!db) return undefined;
  
  const tx = db.transaction(
    MESSAGE_STORE,
    "readonly"
  );

  const store = tx.objectStore(
    MESSAGE_STORE
  );

  const index = store.index(
    "by_chat_owner_id"
  );

  const key: [number, number, "private", number] = [
    chatId,
    ownerId,
    "private",
    messageId,
  ];

  console.log(
    "🧪 [DIRECT GET] EXACT KEY:",
    key
  );

  const result =
    await index.get(key);

  console.log(
    "🧪 [DIRECT GET] EXACT RESULT:",
    result
  );

  console.log(
    "🧪 [DIRECT GET] REPLY:",
    {
      id: result?.id,
      reply_to: result?.reply_to,
      reply_to_id: result?.reply_to_id,
      client_id: result?.client_id,
    }
  );

  return result;
}

export async function getLatestMessages(
    chatId: number,
    ownerId: number,
    limit = 50
): Promise<Message[]> {
    const db = await getDB();

    if (!db) return [];

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.bound(
            [chatId, ownerId, "private", 0],
            [chatId, ownerId, "private", Number.MAX_SAFE_INTEGER]
        ),
        "prev"
    );

    const result = [];

    while (cursor && result.length < limit) {
        if (cursor.value.chat_type === "private") {
            result.push(cursor.value);
        }
    
        cursor = await cursor.continue();
    }

    return result.reverse() as Message[];
}

export async function getMessagesBefore(
    chatId: number,
    ownerId: number,
    anchorId: number,
    limit = 25
): Promise<Message[]> {
    const db = await getDB();

    if (!db) return [];

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.bound(
            [chatId, ownerId, "private", 0],
            [chatId, ownerId, "private", anchorId],
            false,
            true
        ),
        "prev"
    );

    const result = [];

    while (cursor && result.length < limit) {
        if (cursor.value.chat_type === "private") {
            result.push(cursor.value);
        }
    
        cursor = await cursor.continue();
    }

    return result.reverse() as Message[];
}

export async function getMessagesAfter(
    chatId: number,
    ownerId: number,
    anchorId: number,
    limit = 25
): Promise<Message[]> {
    const db = await getDB();

    if (!db) return [];

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.lowerBound(
            [chatId, ownerId, "private", anchorId],
            true
        )
    );

    const result = [];

    while (cursor && result.length < limit) {
        if (cursor.value.chat_type === "private") {
            result.push(cursor.value);
        }
    
        cursor = await cursor.continue();
    }

    return result as Message[];
}

export async function getMessagesWindow(
    chatId: number,
    ownerId: number,
    anchorId: number,
    before = 25,
    after = 25
): Promise<Message[]> {
    const [
        older,
        newer,
        anchor,
    ] = await Promise.all([
        getMessagesBefore(
            chatId,
            ownerId,
            anchorId,
            before
        ),
        getMessagesAfter(
            chatId,
            ownerId,
            anchorId,
            after
        ),
        getMessage(
            chatId,
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

export function deleteMessagesOutsideWindow(
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

export async function updateMessage(
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
  if (
    Number(msg.ownerId) !==
    Number(ownerId)
  ) {
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

export async function syncServerMessage(
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
      "[PRIVATE SYNC] Local message not found:",
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
      server.id ??import {
getDB,
MESSAGE_STORE,
POST_DRAFT_STORE,
CHAT_DRAFT_STORE,
COMMUNITY_DRAFT_STORE,
CHAT_STORE,
CHAT_READ,
resetDatabase,
} from "./db";
import type { Message } from "@/utils/chat/messageContract";

// ============================================================
// HELPERS
// ============================================================

function generateId() {
return "${Date.now()}-${Math.random() .toString(36) .slice(2)}-${Math.random() .toString(36) .slice(2)}";
}

function json(value: any, fallback: any = null) {
try {
return JSON.stringify(value ?? fallback);
} catch {
return JSON.stringify(fallback);
}
}

function parseJson<T = any>(value: any, fallback: T): T {
if (value === null || value === undefined) {
return fallback;
}

if (typeof value !== "string") {
return value as T;
}

try {
return JSON.parse(value);
} catch {
return fallback;
}
}

/**

* SQLite stores the flexible Message object as columns + JSON.
* Convert a database row back into the shape expected by the app.
  */
  function hydrateMessage(row: any): any {
  if (!row) return row;

return {
...row,

id:
  row.id !== null &&
  row.id !== undefined
    ? Number(row.id)
    : row.id,

chat:
  row.chat !== null &&
  row.chat !== undefined
    ? Number(row.chat)
    : row.chat,

community:
  row.community !== null &&
  row.community !== undefined
    ? Number(row.community)
    : row.community,

communityId:
  row.communityId !== null &&
  row.communityId !== undefined
    ? Number(row.communityId)
    : row.communityId,

sender:
  row.sender !== null &&
  row.sender !== undefined
    ? Number(row.sender)
    : row.sender,

ownerId:
  row.ownerId !== null &&
  row.ownerId !== undefined
    ? Number(row.ownerId)
    : row.ownerId,

server_id:
  row.server_id !== null &&
  row.server_id !== undefined
    ? Number(row.server_id)
    : row.server_id,

hidden_for: parseJson(row.hidden_for, []),
reactions: parseJson(row.reactions, []),
files: parseJson(row.files, []),
media_assets: parseJson(row.media_assets, []),
media_url: parseJson(row.media_url, []),
thumbnail: parseJson(row.thumbnail, []),
duration: parseJson(row.duration, []),
waveform: parseJson(row.waveform, []),
delivered_to: parseJson(row.delivered_to, []),
seen_by: parseJson(row.seen_by, []),
read_by: parseJson(row.read_by, []),
reply_to: parseJson(row.reply_to, null),
mentions: parseJson(row.mentions, []),

};
}

function serializeMessage(record: any) {
const {
hidden_for,
reactions,
files,
media_assets,
media_url,
thumbnail,
duration,
waveform,
delivered_to,
seen_by,
read_by,
reply_to,
mentions,
...rest
} = record;

return {
...rest,

hidden_for: json(hidden_for, []),
reactions: json(reactions, []),
files: json(files, []),
media_assets: json(media_assets, []),
media_url: json(media_url, []),
thumbnail: json(thumbnail, []),
duration: json(duration, []),
waveform: json(waveform, []),
delivered_to: json(delivered_to, []),
seen_by: json(seen_by, []),
read_by: json(read_by, []),
reply_to: json(reply_to, null),
mentions: json(mentions, []),

};
}

function messageColumns() {
return [
"account_message_key",
"client_id",
"id",
"server_id",
"ownerId",
"client_sequence",
"sender",
"chat",
"community",
"communityId",
"chat_type",
"encrypted_text",
"caption",
"media_type",
"media_source",
"media_url",
"thumbnail",
"duration",
"waveform",
"status",
"media_status",
"upload_progress",
"created_at",
"updated_at",
"server_created_at",
"client_created_at",
"files",
"reactions",
"hidden_for",
"is_deleted",
"delivered_to",
"seen_by",
"read_by",
"reply_to",
"reply_to_id",
"reply_to_client_id",
"mentions",
"retryable",
];
}

async function upsertMessage(db: any, record: any) {
const serialized = serializeMessage(record);

const columns = messageColumns();

const values = columns.map(
(column) =>
serialized[column] !== undefined
? serialized[column]
: null
);

const placeholders = columns
.map(() => "?")
.join(", ");

await db.runAsync(
"INSERT OR REPLACE INTO messages (${columns.join(", ")}) VALUES (${placeholders})",
values
);
}

async function getMessageByKey(
db: any,
accountMessageKey: string
) {
const row = await db.getFirstAsync(
"SELECT * FROM messages WHERE account_message_key = ? LIMIT 1",
[accountMessageKey]
);

return hydrateMessage(row);
}

// ============================================================
// MESSAGES
// ============================================================

export async function saveMessage(
msg: Message,
ownerId?: number
) {
const db = await getDB();
if (!db) return;

const effectiveOwnerId = Number(
msg.ownerId ?? ownerId
);

const clientId =
msg.client_id ?? "server-${msg.id}";

const accountMessageKey =
"${effectiveOwnerId}:${clientId}";

const clean = {
...msg,

client_id: clientId,

ownerId: effectiveOwnerId,

account_message_key:
  accountMessageKey,

hidden_for:
  msg.hidden_for || [],

is_deleted:
  msg.is_deleted || false,

reactions:
  msg.reactions || [],

files: (msg.files || []).map(
  (file: any) => ({
    blob:
      file.blob ?? file,

    name:
      file.name,

    type:
      file.type,

    size:
      file.size,

    media_url:
      file.media_url,

    thumbnail:
      file.thumbnail,

    duration:
      file.duration,
  })
),

};

await upsertMessage(db, {
...clean,
chat_type: "private",
});
}

export async function deleteMessage(
clientId: string,
ownerId: number
) {
const db = await getDB();
if (!db) return;

const accountMessageKey =
"${Number(ownerId)}:${clientId}";

const message =
await getMessageByKey(
db,
accountMessageKey
);

if (!message) {
return;
}

if (
Number(message.ownerId) !==
Number(ownerId)
) {
console.warn(
"[SQLITE DELETE] Owner mismatch:",
{
clientId,
ownerId,
messageOwnerId:
message.ownerId,
}
);

return;

}

await db.runAsync(
"DELETE FROM messages WHERE account_message_key = ?",
[accountMessageKey]
);

console.log(
"[SQLITE DELETE] Message deleted:",
{
accountMessageKey,
clientId,
ownerId,
}
);
}

// ============================================================
// MEDIA NORMALIZATION
// ============================================================

function normalizeMessageFiles(
msg: any,
existing?: any
) {
const incomingFiles =
Array.isArray(msg.files)
? msg.files
: [];

const existingFiles =
Array.isArray(existing?.files)
? existing.files
: [];

const mediaAssets =
Array.isArray(msg.media_assets)
? msg.media_assets
: [];

if (incomingFiles.length > 0) {
return incomingFiles.map(
(file: any) => ({
blob:
file?.blob ?? null,

    name:
      file?.name ?? null,

    type:
      file?.type ??
      file?.content_type ??
      file?.media_type ??
      "image",

    size:
      file?.size ?? null,

    media_url:
      file?.media_url ??
      file?.original_url ??
      file?.url ??
      file?.uri ??
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
  })
);

}

if (existingFiles.length > 0) {
return existingFiles;
}

if (mediaAssets.length > 0) {
return mediaAssets.map(
(asset: any) => ({
blob:
asset?.blob ?? null,

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
      asset?.original_url ??
      asset?.media_url ??
      asset?.url ??
      null,

    thumbnail:
      asset?.thumbnail_url ??
      asset?.thumbnail ??
      null,

    duration:
      asset?.duration ?? null,

    media_id:
      asset?.media_id ?? null,

    media_type:
      asset?.media_type ?? null,
  })
);

}

const externalUrls =
Array.isArray(msg.external_media_urls)
? msg.external_media_urls
: [];

if (externalUrls.length > 0) {
return externalUrls.map(
(url: string) => ({
blob: null,
name: null,
type:
msg.media_type ?? "image",
size: null,
media_url: url,
thumbnail: null,
duration: null,
media_id: null,
media_type:
msg.media_type ?? null,
})
);
}

return [];
}

// ============================================================
// SAVE MANY
// ============================================================

export async function saveMessages(
messages: Message[],
ownerId?: number
) {
if (
!Array.isArray(messages) ||
messages.length === 0
) {
return;
}

if (
ownerId === undefined ||
ownerId === null ||
!Number.isFinite(Number(ownerId))
) {
console.error(
"❌ [SQLITE SAVE] INVALID OWNER ID:",
ownerId
);
return;
}

const effectiveOwnerId =
Number(ownerId);

const db = await getDB();

if (!db) {
console.error(
"❌ [SQLITE SAVE] SQLite unavailable"
);
return;
}

console.log(
"💾 [SQLITE SAVE] Saving ${messages.length} messages for owner ${effectiveOwnerId}"
);

for (const msg of messages) {
try {
const clientId =
msg.client_id ??
(
msg.id != null
? "server-${msg.id}"
: generateId()
);

  const accountMessageKey =
    `${effectiveOwnerId}:${clientId}`;

  const existing =
    await getMessageByKey(
      db,
      accountMessageKey
    );

  const replyTo =
    msg.reply_to !== undefined &&
    msg.reply_to !== null
      ? msg.reply_to
      : existing?.reply_to ??
        null;

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

  const files =
    normalizeMessageFiles(
      msg,
      existing
    );

  const mediaAssets =
    Array.isArray(
      (msg as any).media_assets
    )
      ? (msg as any).media_assets
      : Array.isArray(
          existing?.media_assets
        )
        ? existing.media_assets
        : [];

  const normalizedThumbnail =
    Array.isArray(msg.thumbnail) &&
    msg.thumbnail.length > 0
      ? msg.thumbnail
      : mediaAssets
          .map(
            (asset: any) =>
              asset?.thumbnail_url
          )
          .filter(Boolean);

  const normalizedDuration =
    Array.isArray(msg.duration) &&
    msg.duration.length > 0
      ? msg.duration
      : mediaAssets
          .map(
            (asset: any) =>
              asset?.duration
          )
          .filter(
            (duration: any) =>
              duration !== null &&
              duration !== undefined
          );

  const isOwnMessage =
    Number(msg.sender) ===
    effectiveOwnerId;

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
      "private",

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
      files.map(
        (file: any) => ({
          blob:
            file?.blob ?? null,

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
        })
      ),

    media_assets:
      (msg as any).media_assets ??
      existing?.media_assets ??
      [],

    media_url:
      msg.media_url ??
      existing?.media_url ??
      [],

    thumbnail:
      normalizedThumbnail,

    duration:
      normalizedDuration,
  };

  console.log(
    "📝 [SQLITE SAVE] WRITING:",
    {
      key:
        accountMessageKey,

      id:
        record.id,

      server_id:
        record.server_id,

      client_id:
        record.client_id,

      chat:
        record.chat,

      ownerId:
        record.ownerId,

      media_type:
        record.media_type,

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

  await upsertMessage(
    db,
    record
  );

  const saved =
    await getMessageByKey(
      db,
      accountMessageKey
    );

  console.log(
    "🔄 [SQLITE SAVE] READ BACK:",
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

      media_assets:
        saved?.media_assets?.length,

      files:
        saved?.files?.length,

      reply_to:
        saved?.reply_to,
    }
  );

  if (!saved) {
    console.error(
      "🚨 [SQLITE SAVE] WRITE FAILED",
      {
        accountMessageKey,
        id: record.id,
        client_id:
          record.client_id,
      }
    );
  }
} catch (error) {
  console.error(
    "❌ [SQLITE SAVE] Failed:",
    {
      id: msg.id,
      client_id:
        msg.client_id,
      error,
    }
  );
}

}

console.log(
"✅ [SQLITE SAVE] COMPLETE"
);
}

// ============================================================
// VISIBILITY
// ============================================================

export const isHiddenForUser = (
msg: any,
userId: number
) => {
return (
Array.isArray(msg.hidden_for) &&
msg.hidden_for.includes(userId)
);
};

// ============================================================
// CHAT META
// ============================================================

export async function getChatMeta(
chatId: number
) {
const db = await getDB();
if (!db) return null;

return db.getFirstAsync(
"SELECT * FROM chats WHERE chatId = ? LIMIT 1",
[chatId]
);
}

export async function getAllChatMeta() {
const db = await getDB();
if (!db) return [];

return db.getAllAsync(
"SELECT * FROM chats"
);
}

export async function saveChatMeta(
chatId: number,
userId: number,
username: string,
avatar: string | null
) {
const db = await getDB();
if (!db) return;

await db.runAsync(
"INSERT OR REPLACE INTO chats ( chatId, userId, username, avatar ) VALUES (?, ?, ?, ?)",
[
chatId,
userId,
username,
avatar,
]
);
}

// ============================================================
// MESSAGE QUERIES
// ============================================================

export async function getMessagesByChat(
chatId: number,
ownerId: number
) {
const db = await getDB();
if (!db) return [];

const rows =
await db.getAllAsync(
"SELECT * FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = 'private' ORDER BY COALESCE( client_sequence, id ) ASC",
[
Number(chatId),
Number(ownerId),
]
);

return rows
.map(hydrateMessage)
.filter(
(m: any) =>
m.chat_type === "private" &&
!isHiddenForUser(
m,
ownerId
)
);
}

export async function getMessage(
chatId: number,
ownerId: number,
messageId: number
): Promise<Message | undefined> {
const db = await getDB();

if (!db) return undefined;

console.log(
"[GET MESSAGE] Looking for:",
[
chatId,
ownerId,
"private",
messageId,
]
);

const row =
await db.getFirstAsync(
"SELECT * FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = 'private' AND id = ? LIMIT 1",
[
Number(chatId),
Number(ownerId),
Number(messageId),
]
);

const result =
hydrateMessage(row);

console.log(
"[GET MESSAGE] RESULT:",
result
);

return result
? (result as Message)
: undefined;
}

export async function debugGetExactMessage(
chatId: number,
ownerId: number,
chatType: string,
messageId: number
) {
const db = await getDB();

if (!db) return undefined;

const result =
await db.getFirstAsync(
"SELECT * FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = ? AND id = ? LIMIT 1",
[
Number(chatId),
Number(ownerId),
chatType,
Number(messageId),
]
);

const hydrated =
hydrateMessage(result);

console.log(
"🧪 [DIRECT GET] EXACT RESULT:",
hydrated
);

console.log(
"🧪 [DIRECT GET] REPLY:",
{
id:
hydrated?.id,

  reply_to:
    hydrated?.reply_to,

  reply_to_id:
    hydrated?.reply_to_id,

  client_id:
    hydrated?.client_id,
}

);

return hydrated;
}

// ============================================================
// LATEST
// ============================================================

export async function getLatestMessages(
chatId: number,
ownerId: number,
limit = 50
): Promise<Message[]> {
const db = await getDB();

if (!db) return [];

const rows =
await db.getAllAsync(
"SELECT * FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = 'private' ORDER BY COALESCE( id, 0 ) DESC LIMIT ?",
[
Number(chatId),
Number(ownerId),
Number(limit),
]
);

return rows
.map(hydrateMessage)
.filter(
(m: any) =>
m.chat_type === "private"
)
.reverse() as Message[];
}

// ============================================================
// BEFORE
// ============================================================

export async function getMessagesBefore(
chatId: number,
ownerId: number,
anchorId: number,
limit = 25
): Promise<Message[]> {
const db = await getDB();

if (!db) return [];

const rows =
await db.getAllAsync(
"SELECT * FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = 'private' AND id < ? ORDER BY id DESC LIMIT ?",
[
Number(chatId),
Number(ownerId),
Number(anchorId),
Number(limit),
]
);

return rows
.map(hydrateMessage)
.filter(
(m: any) =>
m.chat_type === "private"
)
.reverse() as Message[];
}

// ============================================================
// AFTER
// ============================================================

export async function getMessagesAfter(
chatId: number,
ownerId: number,
anchorId: number,
limit = 25
): Promise<Message[]> {
const db = await getDB();

if (!db) return [];

const rows =
await db.getAllAsync(
"SELECT * FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = 'private' AND id > ? ORDER BY id ASC LIMIT ?",
[
Number(chatId),
Number(ownerId),
Number(anchorId),
Number(limit),
]
);

return rows
.map(hydrateMessage)
.filter(
(m: any) =>
m.chat_type === "private"
) as Message[];
}

// ============================================================
// WINDOW
// ============================================================

export async function getMessagesWindow(
chatId: number,
ownerId: number,
anchorId: number,
before = 25,
after = 25
): Promise<Message[]> {
const [
older,
newer,
anchor,
] = await Promise.all([
getMessagesBefore(
chatId,
ownerId,
anchorId,
before
),

getMessagesAfter(
  chatId,
  ownerId,
  anchorId,
  after
),

getMessage(
  chatId,
  ownerId,
  anchorId
),

]);

return [
...older,
...(anchor
? [anchor]
: []),
...newer,
];
}

// ============================================================
// WINDOW MEMORY
// ============================================================

export function deleteMessagesOutsideWindow(
messages: Message[],
anchorId: number,
keepBefore = 40,
keepAfter = 40
) {
const anchorIndex =
messages.findIndex(
(m) => m.id === anchorId
);

if (anchorIndex === -1) {
return messages;
}

const start =
Math.max(
0,
anchorIndex - keepBefore
);

const end =
Math.min(
messages.length,
anchorIndex +
keepAfter +
1
);

return messages.slice(
start,
end
);
}

// ============================================================
// UPDATE
// ============================================================

export async function updateMessage(
client_id: string,
ownerId: number,
patch: any
) {
const db = await getDB();
if (!db) return;

const accountMessageKey =
"${ownerId}:${client_id}";

const msg =
await getMessageByKey(
db,
accountMessageKey
);

if (!msg) return;

if (
Number(msg.ownerId) !==
Number(ownerId)
) {
return;
}

const normalizedPatch = {
...patch,

...(patch.media_url !==
  undefined && {
  media_url:
    Array.isArray(
      patch.media_url
    )
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

...(patch.thumbnail !==
  undefined && {
  thumbnail:
    Array.isArray(
      patch.thumbnail
    )
      ? patch.thumbnail
      : patch.thumbnail
        ? [patch.thumbnail]
        : [],
}),

...(patch.duration !==
  undefined && {
  duration:
    Array.isArray(
      patch.duration
    )
      ? patch.duration
      : patch.duration != null
        ? [patch.duration]
        : [],
}),

};

await upsertMessage(
db,
{
...msg,
...normalizedPatch,
account_message_key:
accountMessageKey,
}
);
}

// ============================================================
// SERVER SYNC
// ============================================================

export async function syncServerMessage(
client_id: string,
ownerId: number,
server: Partial<Message>
) {
const db = await getDB();

if (!db) return;

const effectiveOwnerId =
Number(ownerId);

const accountMessageKey =
"${effectiveOwnerId}:${client_id}";

const local =
await getMessageByKey(
db,
accountMessageKey
);

if (!local) {
console.warn(
"[PRIVATE SYNC] Local message not found:",
{
client_id,
ownerId:
effectiveOwnerId,
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
localOwnerId:
local.ownerId,
ownerId:
effectiveOwnerId,
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

client_created_at:
  clientCreatedAt,

client_sequence:
  local.client_sequence ??
  server.client_sequence,

chat_type:
  local.chat_type ??
  (server as any).chat_type ??
  "private",

status:
  server.status ??
  "sent",

retryable:
  false,

};

await upsertMessage(
db,
merged
);

console.log(
"✅ [PRIVATE SYNC] SERVER ACK SAVED TO SQLITE:",
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

// ============================================================
// PENDING
// ============================================================

export async function getPendingMessages(
ownerId: number
) {
const db = await getDB();

if (!db) return [];

const rows =
await db.getAllAsync(
"SELECT * FROM messages WHERE ownerId = ? AND chat_type = 'private' AND ( server_id IS NULL OR server_id = '' ) AND ( is_deleted = 0 OR is_deleted IS NULL ) AND ( status = 'pending' OR status = 'uploading' OR status = 'sending' OR ( status = 'failed' AND retryable = 1 ) ) ORDER BY COALESCE( client_sequence, id ) ASC",
[Number(ownerId)]
);

const pending =
rows
.map(hydrateMessage)
.filter(
(m: any) =>
Number(m.ownerId) ===
Number(ownerId) &&
m.chat_type ===
"private" &&
!m.server_id &&
!m.is_deleted &&
!isHiddenForUser(
m,
ownerId
)
);

console.log(
"[getPendingMessages]",
pending.map(
(m: any) => ({
client_id:
m.client_id,

    status:
      m.status,

    media_type:
      m.media_type,

    media_url:
      m.media_url,

    files:
      m.files?.map(
        (f: any) => ({
          name:
            f.name,

          type:
            f.type,

          hasBlob:
            !!f.blob,

          blobType:
            f.blob?.type,

          thumbnail:
            f.thumbnail,

          duration:
            f.duration,

          media_url:
            f.media_url,
        })
      ) || [],
  })
)

);

return pending;
}

// ============================================================
// DELETE CHAT DATA
// ============================================================

export async function deleteChatData(
chatId: number,
ownerId: number
) {
const db = await getDB();

if (!db) return;

await db.runAsync(
"DELETE FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = 'private'",
[
Number(chatId),
Number(ownerId),
]
);

await db.runAsync(
"DELETE FROM drafts WHERE chatId = ?",
[Number(chatId)]
);
}

export async function deleteChatDataByType(
conversationId: number,
ownerId: number,
chatType:
| "private"
| "community"
) {
const db = await getDB();

if (!db) return;

const result =
await db.runAsync(
"DELETE FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = ?",
[
Number(conversationId),
Number(ownerId),
chatType,
]
);

const draftStoreName =
chatType === "private"
? CHAT_DRAFT_STORE
: COMMUNITY_DRAFT_STORE;

const draftTable =
chatType === "private"
? "drafts"
: "community_drafts";

try {
await db.runAsync(
"DELETE FROM ${draftTable} WHERE ${ chatType === "private" ? "chatId" : "communityId" } = ?",
[Number(conversationId)]
);
} catch {
// Ignore missing draft.
}

console.log(
"[CHAT DELETE] Local chat data deleted:",
{
conversationId,
ownerId,
chatType,
messagesDeleted:
result.changes,
}
);
}

// ============================================================
// CHAT TYPE
// ============================================================

export async function getMessagesByChatType(
conversationId: number,
ownerId: number,
chatType:
| "private"
| "community"
) {
const db = await getDB();

if (!db) return [];

const rows =
await db.getAllAsync(
"SELECT * FROM messages WHERE chat = ? AND ownerId = ? AND chat_type = ? ORDER BY COALESCE( client_sequence, id ) ASC",
[
Number(conversationId),
Number(ownerId),
chatType,
]
);

return rows
.map(hydrateMessage)
.filter(
(message: any) =>
Number(
message.ownerId
) === Number(ownerId) &&
message.chat_type ===
chatType &&
!isHiddenForUser(
message,
ownerId
)
);
}

// ============================================================
// DRAFTS
// ============================================================

export const saveDraft = async ({
chatId,
text,
updated_at,
}: {
chatId: number;
text: string;
updated_at?: string;
}) => {
if (
chatId === undefined ||
chatId === null ||
Number.isNaN(chatId)
) {
console.error(
"Invalid chatId",
chatId
);
return;
}

const db = await getDB();

if (!db) return;

await db.runAsync(
"INSERT OR REPLACE INTO drafts ( chatId, text, updated_at ) VALUES (?, ?, ?)",
[
Number(chatId),
text,
updated_at ??
new Date().toISOString(),
]
);
};

export const getDraft = async (
chatId: number
) => {
const db = await getDB();

if (!db) return null;

return db.getFirstAsync(
"SELECT * FROM drafts WHERE chatId = ? LIMIT 1",
[Number(chatId)]
);
};

export const deleteDraft = async (
chatId: number
) => {
const db = await getDB();

if (!db) return;

return db.runAsync(
"DELETE FROM drafts WHERE chatId = ?",
[Number(chatId)]
);
};

export const getAllDrafts = async () => {
const db = await getDB();

if (!db) return [];

return db.getAllAsync(
"SELECT * FROM drafts ORDER BY updated_at DESC"
);
};

// ============================================================
// POST DRAFTS
// ============================================================

export async function savePostDraft(
draft: {
draftId: string;

content: string;

/**
 * Expo NativeMediaFile objects or
 * compatible native media objects.
 */
imageFiles: any[];

video:
  | any
  | string
  | null;

imageUrls: string[];

selectedCommunity:
  | number
  | null;

}
) {
try {
const db = await getDB();

if (!db) return;

await db.runAsync(
  `
    INSERT OR REPLACE INTO post_drafts
    (
      draftId,
      type,
      content,
      imageFiles,
      imageUrls,
      video,
      selectedCommunity,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [
    draft.draftId,

    "manual",

    draft.content,

    json(
      draft.imageFiles,
      []
    ),

    json(
      draft.imageUrls,
      []
    ),

    json(
      draft.video,
      null
    ),

    draft.selectedCommunity,

    Date.now(),
  ]
);

} catch (err) {
console.error(
"savePostDraft failed",
err
);

await resetDatabase();

}
}

export async function getPostDraft(
draftId: string
) {
const db = await getDB();

if (!db) return null;

const row =
await db.getFirstAsync(
"SELECT * FROM post_drafts WHERE draftId = ? LIMIT 1",
[draftId]
);

if (!row) return null;

return {
...row,

imageFiles:
  parseJson(
    row.imageFiles,
    []
  ),

imageUrls:
  parseJson(
    row.imageUrls,
    []
  ),

video:
  parseJson(
    row.video,
    null
  ),

};
}

export async function saveManualPostDraft(
data: any
) {
const db = await getDB();

if (!db) return;

await db.runAsync(
"INSERT OR REPLACE INTO post_drafts ( draftId, type, content, imageFiles, imageUrls, video, selectedCommunity, created_at, updated_at ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
[
data.draftId ??
generateId(),

  "manual",

  data.content ??
    "",

  json(
    data.imageFiles,
    []
  ),

  json(
    data.imageUrls,
    []
  ),

  json(
    data.video,
    null
  ),

  data.selectedCommunity ??
    null,

  Date.now(),

  Date.now(),
]

);
}

export type PostDraft = {
draftId: string;
content: string;
imageFiles: any[];
imageUrls: string[];
video:
| any
| string
| null;
type:
| "manual"
| "auto";
selectedCommunity:
| number
| null;
updated_at: number;
title?: string;
communityName?: string;
};

export async function getAllPostDrafts() {
const db = await getDB();

if (!db) return [];

const rows =
await db.getAllAsync(
"SELECT * FROM post_drafts WHERE type = 'manual' ORDER BY updated_at DESC"
);

return rows.map(
(row: any) => ({
...row,

  imageFiles:
    parseJson(
      row.imageFiles,
      []
    ),

  imageUrls:
    parseJson(
      row.imageUrls,
      []
    ),

  video:
    parseJson(
      row.video,
      null
    ),
})

) as PostDraft[];
}

export async function saveAutoPostDraft(
data: any
) {
const db = await getDB();

if (!db) return;

console.log(
"Saving draft:",
{
draftId:
data.draftId,

  content:
    data.content,

  imageFiles:
    data.imageFiles,

  imageUrls:
    data.imageUrls,

  video:
    data.video,

  selectedCommunity:
    data.selectedCommunity,
}

);

try {
const record = {
draftId:
data.draftId,

  type:
    data.type === "auto"
      ? "auto"
      : "manual",

  updated_at:
    Date.now(),

  content:
    data.content,

  imageUrls:
    data.imageUrls,

  selectedCommunity:
    data.selectedCommunity,

  imageFiles:
    data.imageFiles,

  video:
    data.video,
};

await db.runAsync(
  `
    INSERT OR REPLACE INTO post_drafts
    (
      draftId,
      type,
      content,
      imageFiles,
      imageUrls,
      video,
      selectedCommunity,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [
    record.draftId,

    record.type,

    record.content ??
      "",

    json(
      record.imageFiles,
      []
    ),

    json(
      record.imageUrls,
      []
    ),

    json(
      record.video,
      null
    ),

    record.selectedCommunity ??
      null,

    record.updated_at,
  ]
);

} catch (err) {
console.error(
"Draft save failed",
err
);

console.log(
  "Data causing error:",
  data
);

}
}

export async function deletePostDraft(
draftId: string
) {
const db = await getDB();

if (!db) return;

return db.runAsync(
"DELETE FROM post_drafts WHERE draftId = ?",
[draftId]
);
}

// ============================================================
// CHAT SCROLL
// ============================================================

export async function saveChatScroll({
chatId,
userId,
messageId,
clientId,
offset,
}: {
chatId: number;
userId: number;
messageId?: number | string;
clientId?: number | string;
offset: number;
}) {
const db = await getDB();

if (!db) return;

return db.runAsync(
"INSERT OR REPLACE INTO chat_scroll ( id, chatId, userId, messageId, clientId, offset, updatedAt ) VALUES (?, ?, ?, ?, ?, ?, ?)",
[
"${userId}-${chatId}",

  Number(chatId),

  Number(userId),

  messageId ??
    null,

  clientId ??
    null,

  Number(offset),

  Date.now(),
]

);
}

export async function getChatScroll(
chatId: number,
userId: number
) {
const db = await getDB();

if (!db) return null;

return db.getFirstAsync(
"SELECT * FROM chat_scroll WHERE id = ? LIMIT 1",
[
"${userId}-${chatId}",
]
);
}

// ============================================================
// CHAT READ
// ============================================================

export async function saveChatRead({
chatId,
userId,
messageId,
clientId,
}: {
chatId: number;
userId: number;
messageId?: number | string;
clientId?: number | string;
}) {
const db = await getDB();

if (!db) return;

return db.runAsync(
"INSERT OR REPLACE INTO chat_read ( id, chatId, userId, messageId, clientId, updatedAt ) VALUES (?, ?, ?, ?, ?, ?)",
[
"${userId}-${chatId}",

  Number(chatId),

  Number(userId),

  messageId ??
    null,

  clientId ??
    null,

  Date.now(),
]

);
}

export async function getChatRead(
chatId: number,
userId: number
) {
const db = await getDB();

if (!db) return null;

return db.getFirstAsync(
"SELECT * FROM chat_read WHERE id = ? LIMIT 1",
[
"${userId}-${chatId}",
]
);
}