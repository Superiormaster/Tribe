  import {
  getDB,
  OUTBOX_STORE,
  type ChatType,
} from "@/lib/db";

import type {
  Message,
} from "@/utils/chat/messageContract";

export type OutboxStatus =
  | "pending"
  | "processing"
  | "failed";

export interface OutboxItem {
  client_id: string;

  ownerId: number;
  chat_id: number;

  chat_type:
    | "private"
    | "community";

  status:
    | OutboxStatus;

  attempts: number;

  next_attempt_at: number;

  created_at: number;

  processing_at?: number | null;

  last_error?:
    | string
    | null;
}

export async function removeFromOutbox(
  clientId: string
) {

  const db =
    await getDB();

  if (!db) return;

  await db.delete(
    OUTBOX_STORE,
    clientId
  );

  console.log(
    "[OUTBOX] Removed:",
    clientId
  );
}

export async function deleteOutboxMessagesForChat(
  chatId: number,
  ownerId: number,
  chatType: "private" | "community"
) {
  const db = await getDB();
  if (!db) return;

  const all =
    await db.getAll(OUTBOX_STORE);

  const items =
    all.filter(
      item =>
        Number(item.ownerId) === Number(ownerId) &&
        Number((item as any).chat_id) === Number(chatId) &&
        item.chat_type === chatType
    );

  for (const item of items) {
    await db.delete(
      OUTBOX_STORE,
      item.client_id
    );
  }

  console.log(
    "[OUTBOX] Deleted chat pending messages:",
    {
      chatId,
      ownerId,
      chatType,
      count: items.length,
      clientIds: items.map(
        item => item.client_id
      ),
    }
  );
}

export async function getOutboxItem(
  clientId: string
) {

  const db =
    await getDB();

  if (!db) return null;

  return db.get(
    OUTBOX_STORE,
    clientId
  );
}

export async function getOutboxMessages(
  ownerId: number
) {

  const db = await getDB();

  if (!db) return [];


  const all =
    await db.getAll(
      OUTBOX_STORE
    );


  return all
    .filter(
      item =>
        item.ownerId === ownerId
    )
    .sort(
      (a, b) =>
        a.created_at -
        b.created_at
    );
}

export async function getPendingOutbox(
  ownerId: number
) {
  const db =
    await getDB();

  if (!db) return [];

  const all =
    await db.getAll(
      OUTBOX_STORE
    );

  const now =
    Date.now();

  return all
    .filter(
      item =>
        item.ownerId === ownerId &&
        (
          item.status === "pending" ||
          (item.status as string) === "failed"
        ) &&
        item.next_attempt_at <= now
    )
    .sort(
      (a, b) =>
        a.created_at -
        b.created_at
    );
}

export async function markOutboxProcessing(
  clientId: string
) {

  const db =
    await getDB();

  if (!db) return null;

  const item =
    await db.get(
      OUTBOX_STORE,
      clientId
    );

  if (!item) {
    return null;
  }

  const updated: OutboxItem = {
    ...item,
  
    chat_id:
      Number((item as any).chat_id),
  
    status:
      "processing",
  
    attempts:
      item.attempts + 1,
  
    processing_at:
      Date.now(),
  
    last_error:
      null,
  };

  await db.put(
    OUTBOX_STORE,
    updated
  );

  return updated;
}

export async function getNextOutboxMessage(
  ownerId: number
) {

  const db = await getDB();

  if (!db) return null;


  const now =
    Date.now();


  const index =
    db
      .transaction(
        OUTBOX_STORE
      )
      .store
      .index(
        "by_retry"
      );

  const items =
    await index.getAll();

  const eligible =
    items
      .filter(
        item =>
          item.ownerId === ownerId &&
          (
            item.status === "pending" ||
            (item.status as string) === "failed"
          ) &&
          item.next_attempt_at <= now
      )
      .sort(
        (a, b) =>
          a.created_at -
          b.created_at
      );


  return (
    eligible[0] ??
    null
  );
}

export async function markOutboxPending(
  clientId: string,
  error?: unknown,
  delay = 0
) {

  const db =
    await getDB();

  if (!db) return null;

  const item =
    await db.get(
      OUTBOX_STORE,
      clientId
    );

  if (!item) {
    return null;
  }

  const updated: OutboxItem = {
    ...item,

    status:
      "pending",

    next_attempt_at:
      Date.now() +
      delay,

    last_error:
      error instanceof Error
        ? error.message
        : String(error ?? ""),
  };

  await db.put(
    OUTBOX_STORE,
    updated
  );

  return updated;
}

export async function markOutboxFailed(
  clientId: string,
  error?: unknown
) {

  const db =
    await getDB();

  if (!db) return null;

  const item =
    await db.get(
      OUTBOX_STORE,
      clientId
    );

  if (!item) {
    return null;
  }

  const updated: OutboxItem = {
    ...item,

    status:
      "failed",

    last_error:
      error instanceof Error
        ? error.message
        : String(error ?? ""),
  };

  await db.put(
    OUTBOX_STORE,
    updated
  );

  return updated;
}