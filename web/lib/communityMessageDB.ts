import {
  getDB,
  MESSAGE_STORE,
  COMMUNITY_DRAFT_STORE,
  COMMUNITY_STORE,
  resetDatabase
} from "./db";
import type { Message } from "@/utils/chat/messageContract";

// --------------------
// MESSAGES
// --------------------
export async function saveCommunityMessage(msg: Message, ownerId?: number) {
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

  await db.put(MESSAGE_STORE, {
    ...clean,
      chat_type: "community",
  });
}

export async function saveCommunityMessages(messages: Message[], ownerId?: number) {
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
      chat_type: "community",
  
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
        .store.index("by_chat_owner_id");

    return index.get([
        communityId,
        ownerId,
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
        .store.index("by_chat_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.bound(
            [communityId, ownerId, "community", 0],
            [communityId, ownerId, "community", Number.MAX_SAFE_INTEGER]
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
        .store.index("by_chat_owner_id");

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

    const index = db
        .transaction(MESSAGE_STORE)
        .store.index("by_chat_owner_id");

    let cursor = await index.openCursor(
        IDBKeyRange.lowerBound(
            [communityId, "community", ownerId, anchorId],
            true
        )
    );

    const result = [];

    while (cursor && result.length < limit) {
        if (cursor.value.chat_type === "community") {
            result.push(cursor.value);
        }
    
        cursor = await cursor.continue();
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

export async function syncCommunityServerMessage(
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
              m.status === "failed" ||
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
      .getAll([communityId, ownerId]);

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

  return db.get(COMMUNITY_STORE, communityId);
}

export async function getAllCommunityMeta() {
  const db = await getDB();
  if (!db) return [];

  return db.getAll(COMMUNITY_STORE);
}

export async function saveCommunityMeta(
  communityId: number,
  name: string,
  cover_image: string | null
) {
  const db = await getDB();
  if (!db) return;

  await db.put(COMMUNITY_STORE, {
    communityId,
    name,
    cover_image,
  });
}