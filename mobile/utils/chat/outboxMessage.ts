import {
  getDB,
  MESSAGE_STORE,
} from "@/lib/db";

import type {
  Message,
} from "@/utils/chat/messageContract";

export async function getMessageForOutbox(
  clientId: string,
  ownerId: number
): Promise<Message | null> {

  const db = await getDB();

  if (!db) {
    return null;
  }

  const accountMessageKey =
    `${Number(ownerId)}:${clientId}`;

  const message =
    await db.get(
      MESSAGE_STORE,
      accountMessageKey
    );

  if (!message) {
    console.warn(
      "[OUTBOX] Message missing:",
      {
        clientId,
        ownerId,
        accountMessageKey,
      }
    );

    return null;
  }

  if (
    Number(message.ownerId) !==
    Number(ownerId)
  ) {
    console.warn(
      "[OUTBOX] Owner mismatch:",
      {
        clientId,
        ownerId,
        actualOwnerId:
          message.ownerId,
      }
    );

    return null;
  }

  if (message.server_id) {
    console.log(
      "[OUTBOX] Message already synced:",
      clientId
    );

    return null;
  }

  if (message.is_deleted) {
    console.log(
      "[OUTBOX] Message deleted:",
      clientId
    );

    return null;
  }

  return message as Message;
}