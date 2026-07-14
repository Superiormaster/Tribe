import { openDB } from "idb";
import type { Message, LocalFile } from "@/utils/chat/messageContract";

const DB_VERSION = 8;
const DB_NAME = "tribe-chat-db";

const MESSAGE_STORE = "messages";
const CHAT_STORE = "chats";
const DRAFT_STORE = "drafts";
const POST_DRAFT_STORE = "post_drafts";


let dbPromise: any;

function getDB() {

  if (typeof window === "undefined") {
    return null;
  }

  if (!dbPromise) {

    dbPromise = openDB(
      DB_NAME,
      DB_VERSION,
      {
        upgrade(
          db,
          oldVersion,
          newVersion,
          transaction
        ) {

          let store;

          // =====================
          // MESSAGE STORE
          // =====================

          if (
            !db.objectStoreNames.contains(
              MESSAGE_STORE
            )
          ) {

            store =
              db.createObjectStore(
                MESSAGE_STORE,
                {
                  keyPath: "client_id",
                }
              );

          } else {

            store =
              transaction.objectStore(
                MESSAGE_STORE
              );
          }

          // INDEX
          if (
            !store.indexNames.contains(
              "by_chat_owner"
            )
          ) {

            store.createIndex(
              "by_chat_owner",
              ["chat", "ownerId"],
              { unique: false }
            );
          }
  
          if (!store.indexNames.contains("by_chat_owner_id")) {
            store.createIndex(
              "by_chat_owner_id",
              ["chat", "ownerId", "id"],
              { unique: false }
            );
          }

          // INDEX
          if (
            !store.indexNames.contains(
              "created_at"
            )
          ) {

            store.createIndex(
              "created_at",
              "created_at"
            );
          }

          // =====================
          // CHAT STORE
          // =====================

          if (
            !db.objectStoreNames.contains(
              CHAT_STORE
            )
          ) {

            db.createObjectStore(
              CHAT_STORE,
              {
                keyPath: "chatId",
              }
            );
          }

          // =====================
          // DRAFT STORE
          // =====================

          if (
            !db.objectStoreNames.contains(
              DRAFT_STORE
            )
          ) {

            db.createObjectStore(
              DRAFT_STORE,
              {
                keyPath: "chatId",
              }
            );
          }
        
          if (!db.objectStoreNames.contains(POST_DRAFT_STORE)) {
            db.createObjectStore(POST_DRAFT_STORE, {
              keyPath: "draftId",
            });
          }
        
          // CHAT SCROLL STORE
          if (
            !db.objectStoreNames.contains(
              "chat_scroll"
            )
          ) {
            db.createObjectStore(
              "chat_scroll",
              {
                keyPath: "id",
              }
            );
          }
        },

        blocked() {
          console.warn(
            "DB blocked — close other tabs"
          );
        },

        blocking() {
          console.warn(
            "Closing old DB connection"
          );
        },

        terminated() {
          console.warn(
            "DB connection terminated"
          );
        },
      }
    );
  }

  return dbPromise;
}

// --------------------
// MESSAGES
// --------------------
export async function saveMessage(msg: Message, ownerId?: number) {
  const db = await getDB();
  if (!db) return;

  const clean = {
    ...msg,
    client_id: msg.client_id ?? `server-${msg.id}`,
    ownerId: msg.ownerId || ownerId,

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

  await db.put(MESSAGE_STORE, clean);
}

export async function saveMessages(messages: Message[], ownerId?: number) {
  if (!Array.isArray(messages)) {
        console.error("saveMessages expected array:", messages);
        return;
    }

  const db = await getDB();
  if (!db) return;

  const tx = db.transaction(MESSAGE_STORE, "readwrite");

  for (const msg of messages) {

    const record = {
      ...msg,
      client_id: msg.client_id ?? `server-${msg.id}`,
      ownerId: msg.ownerId ?? ownerId,
      hidden_for: msg.hidden_for ?? [],
      is_deleted: msg.is_deleted ?? false,
  
      files: (msg.files || []).map(file => ({
        blob: file.blob ?? file,
        name: file.name,
        type: file.type,
        size: file.size,
        media_url: file.media_url,
        thumbnail: file.thumbnail,
        duration: file.duration,
      })),
    };
  
    console.log(record);
  
    await tx.store.put(record);
  }

  await tx.done;
}

export async function resetDatabase() {

  dbPromise = null;

  return new Promise((resolve, reject) => {

    const req =
      indexedDB.deleteDatabase(DB_NAME);

    req.onsuccess = () => {
      console.log("DB deleted");
      resolve(true);
    };

    req.onerror = () => {
      console.error(
        "DB delete failed"
      );

      reject(req.error);
    };

    req.onblocked = () => {
      console.warn(
        "DB delete blocked"
      );
    };
  });
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
  chatId,
  userId,
  username,
  avatar
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
    [chatId, ownerId]
  );

  return messages.filter(m => !isHiddenForUser(m, ownerId));
}

export async function getMessage(
    chatId: number,
    ownerId: number,
    messageId: number
) {
    const db = await getDB();

    if (!db) return null;

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");

    return index.get([
        chatId,
        ownerId,
        messageId,
    ]);
}

export async function getLatestMessages(
    chatId: number,
    ownerId: number,
    limit = 50
) {
    const db = await getDB();

    if (!db) return [];

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.bound(
            [chatId, ownerId, 0],
            [chatId, ownerId, Number.MAX_SAFE_INTEGER]
        ),
        "prev"
    );

    const result = [];

    while (cursor && result.length < limit) {
        result.push(cursor.value);
        cursor = await cursor.continue();
    }

    return result.reverse();
}

export async function getMessagesBefore(
    chatId: number,
    ownerId: number,
    anchorId: number,
    limit = 25
) {
    const db = await getDB();

    if (!db) return [];

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.bound(
            [chatId, ownerId, 0],
            [chatId, ownerId, anchorId],
            false,
            true
        ),
        "prev"
    );

    const result = [];

    while (cursor && result.length < limit) {
        result.push(cursor.value);
        cursor = await cursor.continue();
    }

    return result.reverse();
}

export async function getMessagesAfter(
    chatId: number,
    ownerId: number,
    anchorId: number,
    limit = 25
) {
    const db = await getDB();

    if (!db) return [];

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.lowerBound(
            [chatId, ownerId, anchorId],
            true
        )
    );

    const result = [];

    while (cursor && result.length < limit) {
        result.push(cursor.value);
        cursor = await cursor.continue();
    }

    return result;
}

export async function getMessagesWindow(
    chatId: number,
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

  const msg = await db.get(
    MESSAGE_STORE,
    client_id
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
  });
}

export async function syncServerMessage(
    client_id:string,
    ownerId:number,
    server:Partial<Message>
){

    const db=await getDB();

    const local=await db.get(
        MESSAGE_STORE,
        client_id
    );

    if(!local) return;
    if(local.ownerId!==ownerId) return;

    await db.put(MESSAGE_STORE,{
      ...local,
      ...server,
      client_id,
      status:"sent",
      upload_progress:100
    });
}

export async function getPendingMessages(
  ownerId: number
) {
  const db = await getDB();
  if (!db) return [];

  const all = await db.getAll(MESSAGE_STORE);

  const pending = all.filter(
      (m) =>
          m.ownerId === ownerId &&
          !m.server_id &&
          !m.is_deleted &&
          !isHiddenForUser(m, ownerId) &&
          (
              m.status === "pending" ||
              m.status === "failed" ||
              m.status === "uploading" ||
              m.status === "sending"
          )
  );
  
  console.log(
    "[getPendingMessages]",
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

export async function deleteChatData(
  chatId: number,
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
      .getAll([chatId, ownerId]);

  for (const msg of messages) {
    await messageStore.delete(msg.client_id);
  }

  await draftStore.delete(chatId);

  await tx.done;
}

// SAVE DRAFT
export const saveDraft = async ({
  chatId,
  text,
  updated_at,
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

  await db.put(DRAFT_STORE, {
    chatId,
    text,
    updated_at:
      updated_at ||
      new Date().toISOString(),
  });
};

// GET DRAFT
export const getDraft = async (
  chatId: number
) => {

  const db = await getDB();

  if (!db) return null;

  return db.get(
    DRAFT_STORE,
    chatId
  );
};

// DELETE DRAFT
export const deleteDraft = async (
  chatId: number
) => {

  const db = await getDB();

  if (!db) return;

  return db.delete(
    DRAFT_STORE,
    chatId
  );
};

// GET ALL DRAFTS
export const getAllDrafts = async () => {

  const db = await getDB();

  if (!db) return [];

  return db.getAll(DRAFT_STORE);
};

export async function savePostDraft(draft: {
    draftId: string;
    content: string;
    imageFiles: File[];
    video: File | string | null;
    imageUrls: string[];
    selectedCommunity: number | null;
}) {
  try {
    const db = await getDB();
    if (!db) return;

    await db.put(POST_DRAFT_STORE, {
      ...draft,
      updated_at: Date.now(),
    });

  } catch (err) {
    console.error("savePostDraft failed", err);

    await resetDatabase();

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }
}

export async function getPostDraft(draftId: string) {
  const db = await getDB();
  if (!db) return null;

  return db.get(POST_DRAFT_STORE, draftId);
}

export async function saveManualPostDraft(data) {

    const db = await getDB();

    if (!db) return;

    await db.put(POST_DRAFT_STORE, {

        ...data,

        draftId: crypto.randomUUID(),

        type: "manual",

        created_at: Date.now(),

        updated_at: Date.now(),
    });
}

export async function getAllPostDrafts() {
    const db = await getDB();
    if (!db) return [];

    const drafts = await db.getAll(POST_DRAFT_STORE);

    return drafts
        .filter(d => d.type === "manual")
        .sort(
            (a, b) =>
                b.updated_at - a.updated_at
        );
}

export async function saveAutoPostDraft(data){

    const db = await getDB();

    if(!db) return;

    await db.put(POST_DRAFT_STORE,{

        ...data,

        draftId:data.draftId,

        type:"auto",

        updated_at:Date.now()

    });

}

export async function deletePostDraft(draftId: string) {
  const db = await getDB();
  if (!db) return;

  return db.delete(POST_DRAFT_STORE, draftId);
}

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

  return db.put("chat_scroll", {
    id: `${userId}-${chatId}`,
    chatId,
    userId,
    messageId,
    clientId,
    offset,
    updatedAt: Date.now(),
  });
}

export async function getChatScroll(
  chatId: number,
  userId: number
) {
  const db = await getDB();
  if (!db) return null;

  return db.get(
    "chat_scroll",
    `${userId}-${chatId}`
  );
}