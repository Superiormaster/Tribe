import { openDB } from "idb";

const DB_VERSION = 4;
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
                  keyPath: "localId",
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
              ["chatId", "ownerId"],
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
export async function saveMessage(msg: any, ownerId?: number) {
  const db = await getDB();
  if (!db) return;

  const clean = {
    localId: msg.localId,
    id: msg.id,
    chatId: msg.chatId,
    ownerId: msg.ownerId || ownerId,

    encrypted_text: msg.encrypted_text,

    status: msg.status || "sending",
    created_at: msg.created_at,

    reply_to: msg.reply_to || null,
  };

  await db.put(MESSAGE_STORE, clean);
}

export async function saveMessages(messages: any[], ownerId?: number) {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction(MESSAGE_STORE, "readwrite");

  for (const msg of messages) {
    tx.store.put({
      localId: msg.localId,
      id: msg.id,
      chatId: msg.chatId,
      ownerId: msg.ownerId || ownerId,
      encrypted_text: msg.encrypted_text,
      status: msg.status || "sent",
      created_at: msg.created_at,
      reply_to: msg.reply_to ?? null,
    });
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

export async function getMessagesByChat(
  chatId: number,
  ownerId: number
) {
  try {
    const db = await getDB();

    if (!db) return [];

    const messages = await db.getAllFromIndex(
      MESSAGE_STORE,
      "by_chat_owner",
      [chatId, ownerId]
    );

    console.log(
      "READ FROM DB",
      messages.map((m: any) => ({
        id: m.id,
        localId: m.localId,
        text: m.text,
        encrypted_text: m.encrypted_text,
        status: m.status,
      }))
    );

    return messages;

  } catch (err) {
    console.error("IndexedDB error:", err);

    try {
      const db = await getDB();
      if (!db) return [];

      const all = await db.getAll(MESSAGE_STORE);

      const messages = all.filter(
        (m: any) =>
          m.chatId === chatId &&
          m.ownerId === ownerId
      );

      console.log(
        "READ FROM DB (FALLBACK)",
        messages.map((m: any) => ({
          id: m.id,
          localId: m.localId,
          text: m.text,
          encrypted_text: m.encrypted_text,
          status: m.status,
        }))
      );

      return messages;

    } catch (e) {
      console.error("Fallback also failed", e);
      await resetDatabase();

      window.location.reload();
      return [];
    }
  }
}

export async function updateMessage(
  localId: string,
  ownerId: number,
  patch: any
) {
  const db = await getDB();
  if (!db) return;

  const msg = await db.get(
    MESSAGE_STORE,
    localId
  );

  if (!msg) return;

  // ACCOUNT PROTECTION
  if (msg.ownerId !== ownerId) {
    return;
  }

  await db.put(MESSAGE_STORE, {
    ...msg,
    ...patch,
  });
}

export async function replaceOptimisticMessage(
  tempId: string,
  serverMsg: any,
  ownerId: number
) {
  const db = await getDB();
  if (!db) return;

  const old = await db.get(MESSAGE_STORE, tempId);
  if (!old) return;

  if (old.ownerId !== ownerId) return;

  const final = {
    ...old,

    // ONLY SAFE SERVER UPDATES
    id: serverMsg.id,
    reply_to: old.reply_to, 
    status: "sent",

    // NEVER overwrite encrypted_text
    encrypted_text: old.encrypted_text,

    created_at: serverMsg.created_at || old.created_at,
    chatId: serverMsg.chatId || old.chatId,
    ownerId,
    localId: tempId,
  };
  
  console.log(
    "REPLACING",
    tempId,
    serverMsg.id
  );

  await db.put(MESSAGE_STORE, final);
}

export async function savePendingMessage(msg: any) {
  const db = await getDB();
  if (!db) return;
  console.log(
    "SAVING PENDING:",
    JSON.stringify(msg.reply_to, null, 2)
  );  

  await db.put(MESSAGE_STORE, {
    ...msg,
    status: "pending",
  });
}

export async function getPendingMessages(
    ownerId: number
  ) {
  const db = await getDB();
  if (!db) return [];

  const all = await db.getAll(MESSAGE_STORE);

  return all.filter(
    (m: any) =>
      m.ownerId === ownerId &&
      (
        m.status === "pending" ||
        m.status === "sending" ||
        m.status === "failed"
      )
  );
}

// SAVE DRAFT
export const saveDraft = async (
  chatId: number,
  text: string
) => {

  const db = await getDB();

  if (!db) return;

  await db.put(DRAFT_STORE, {
    chatId,
    text,
    updated_at: Date.now(),
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
  imageFiles: string[]; // we store URLs or base64, NOT File
  imageUrls: string[];
  video: string | null;
  selectedCommunity: number | null;
}) {
  const db = await getDB();
  if (!db) return;

  await db.put(POST_DRAFT_STORE, {
    ...draft,
    updated_at: Date.now(),
  });
}

export async function getPostDraft(draftId: string) {
  const db = await getDB();
  if (!db) return null;

  return db.get(POST_DRAFT_STORE, draftId);
}

export async function deletePostDraft(draftId: string) {
  const db = await getDB();
  if (!db) return;

  return db.delete(POST_DRAFT_STORE, draftId);
}