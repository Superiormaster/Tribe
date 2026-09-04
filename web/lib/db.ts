import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";

const DB_VERSION = 19;
const DB_NAME = "tribe-chat-db";

export const MESSAGE_STORE = "messages";
export const COMMUNITY_STORE = "communities";
export const CHAT_DRAFT_STORE = "drafts";
export const COMMUNITY_DRAFT_STORE = "community_drafts";
export const CHAT_STORE = "chats";
export const POST_DRAFT_STORE = "post_drafts";
export const OUTBOX_STORE = "message_outbox";
export const CHAT_SCROLL_STORE = "chat_scroll";
export const MESSAGE_SEQUENCE_STORE = "message_sequence";
export const CHAT_READ = "chat_read";

export type ChatType =
  | "private"
  | "community";

export type OutboxStatus =
  | "pending"
  | "processing"
  | "failed";

export interface TribeDB extends DBSchema {

  messages: {
    key: string;

    value: {
      client_id: string;
      id?: number;
      server_id?: number;
      ownerId?: number;
      client_sequence?: number;
      sender?: number;
      chat?: number;
      community?: number;
      communityId?: number;

      chat_type:
        | "private"
        | "community";

      encrypted_text?: string;
      caption?: string;
      media_type?: string;
      media_source?: string;
      media_url?: string[];
      thumbnail?: (string | null)[];
      duration?: number[];
      waveform?: number[];
      status?: string;
      media_status?: string;
      upload_progress?: number;
      created_at?: string;
      updated_at?: string;
      files?: any[];
      reactions?: any[];
      hidden_for?: number[];
      is_deleted?: boolean;
      delivered_to?: number[];
      seen_by?: number[];
      read_by?: number[];
      reply_to?: any;
      mentions?: any[];
      [key: string]: any;
    };

    indexes: {
      by_chat_owner:
        [
          number,
          number,
          ChatType
        ];

      by_chat_owner_id:
        [
          number,
          number,
          ChatType,
          number,
        ];

      by_community_owner_id:
        [
          number,
          number,
          ChatType,
          number,
        ];
  
      by_owner_status:
        [
          number,
          string
        ];

      by_owner_client:
        [
          number,
          string
        ];

      by_owner_type_status:
        [
          number,
          ChatType,
          string
        ];
    };
  };

  chats: {
    key: number;
    value: {
      chatId: number;
      userId: number;
      username: string;
      avatar:
        | string
        | null;

      [key: string]: any;
    };
  };

  message_sequence: {
    key: string;
    value: {
      nextSequence: number;
    };
  };

  communities: {
    key: number;
    value: {
      communityId: number;
      name: string;
      cover_image_url:
        | string
        | null;

      [key: string]: any;
    };
  };

  drafts: {
    key: number;
    value: {
      chatId: number;
      text: string;
      updated_at: string;
    };
  };

  community_drafts: {
    key: number;
    value: {
      communityId: number;
      text: string;
      updated_at: string;
    };
  };

  post_drafts: {
    key: string;

    value: {
      draftId: string;
      type:
        | "manual"
        | "auto";
      content?: string;
      imageFiles?: any[];
      imageUrls?: string[];
      video?: any;

      selectedCommunity?:
        | number
        | null;

      updated_at: number;
      [key: string]: any;
    };
  };

  chat_scroll: {
    key: string;

    value: {
      id: string;
      chatId?: number;
      communityId?: number;
      userId: number;
      messageId?:
        | number
        | string;

      clientId?:
        | number
        | string;

      offset: number;
      updatedAt: number;
    };
  };
  
  chat_read: {
    key: string;
  
    value: {
      id: string;
      chatId?: number;
      communityId?: number;
      userId: number;
  
      messageId?:
        | number
        | string;
  
      clientId?:
        | number
        | string;
  
      updatedAt: number;
    };
  };

  message_outbox: {
    key: string;
    value: {
      client_id: string;
      ownerId: number;
      chat_id: number;
      chat_type: "private" | "community";
      processing_at?: number | null;
      status: "pending" | "processing" | "failed";
      attempts: number;
      next_attempt_at: number;
      created_at: number;
      last_error?: string | null;
    };

    indexes: {

      by_owner_status:
        [
          number,
          OutboxStatus
        ];

      by_retry:
        [
          OutboxStatus,
          number
        ];
    };
  };
}

let dbPromise:
  Promise<IDBPDatabase<TribeDB>>
  | null = null;

export function getDB() {

  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  if (!dbPromise) {

    dbPromise =
      openDB<TribeDB>(
        DB_NAME,
        DB_VERSION,
        {

          upgrade(
            db,
            oldVersion,
            newVersion,
            transaction
          ) {

            console.log(
              `[IndexedDB] upgrade ${oldVersion} → ${newVersion}`
            );

            let messageStore: any;
  
            if (
              !db.objectStoreNames.contains(MESSAGE_STORE)
            ) {
            
              messageStore =
                db.createObjectStore(
                  MESSAGE_STORE,
                  {
                    keyPath:
                      "account_message_key",
                  }
                );
            
            } else {
            
              messageStore =
                transaction.objectStore(
                  MESSAGE_STORE
                );
            
              if (oldVersion < 15) {
            
                console.log(
                  "[IDB MIGRATION] Migrating messages to account-scoped keys..."
                );
            
                const cursorRequest =
                  messageStore.openCursor();
            
                cursorRequest.onsuccess = (event: any) => {
            
                  const cursor =
                    event.target.result;
            
                  if (!cursor) {
            
                    console.log(
                      "[IDB MIGRATION] Message migration complete"
                    );
            
                    return;
                  }
            
                  const message =
                    cursor.value;
            
                  const ownerId =
                    Number(message.ownerId);
            
                  if (!ownerId) {
            
                    console.warn(
                      "[IDB MIGRATION] Missing ownerId:",
                      message
                    );
            
                    cursor.continue();
            
                    return;
                  }
            
                  const clientId =
                    message.client_id ??
                    `server-${message.id}`;
            
                  const accountMessageKey =
                    `${ownerId}:${clientId}`;
            
                  const migrated = {
                    ...message,
            
                    client_id:
                      clientId,
            
                    ownerId:
                      ownerId,
            
                    account_message_key:
                      accountMessageKey,
                  };
            
                  cursor.delete();
            
                  messageStore.put(migrated);
            
                  console.log(
                    "[IDB MIGRATION]",
                    {
                      oldKey: cursor.primaryKey,
                      newKey: accountMessageKey,
                      client_id: clientId,
                      ownerId,
                    }
                  );
            
                  cursor.continue();
                };
              }
            }

            if (
              !db.objectStoreNames.contains(
                MESSAGE_STORE
              )
            ) {

              messageStore =
                db.createObjectStore(MESSAGE_STORE, {
                  keyPath: "account_message_key",
                });

            } else {

              messageStore =
                transaction.objectStore(
                  MESSAGE_STORE
                );
            }

            if (
              !messageStore.indexNames.contains(
                "by_chat_owner"
              )
            ) {

              messageStore.createIndex(
                "by_chat_owner",
                [
                  "chat",
                  "ownerId",
                  "chat_type",
                ],
                {
                  unique: false,
                }
              );
            }

            if (
              !db.objectStoreNames.contains(
                MESSAGE_SEQUENCE_STORE
              )
            ) {
              db.createObjectStore(
                MESSAGE_SEQUENCE_STORE,
                {
                  keyPath: "ownerId",
                }
              );
            }

            if (
              !messageStore.indexNames.contains(
                "by_chat_owner_id"
              )
            ) {

              messageStore.createIndex(
                "by_chat_owner_id",
                [
                  "chat",
                  "ownerId",
                  "chat_type",
                  "id",
                ],
                {
                  unique: false,
                }
              );
            }

            if (
              !messageStore.indexNames.contains(
                "by_owner_status"
              )
            ) {

              messageStore.createIndex(
                "by_owner_status",
                [
                  "ownerId",
                  "status",
                ],
                {
                  unique: false,
                }
              );
            }

            if (
              !messageStore.indexNames.contains(
                "by_owner_client"
              )
            ) {

              messageStore.createIndex(
                "by_owner_client",
                [
                  "ownerId",
                  "client_id",
                ],
                {
                  unique: false,
                }
              );
            }

            if (
              !messageStore.indexNames.contains(
                "by_owner_type_status"
              )
            ) {

              messageStore.createIndex(
                "by_owner_type_status",
                [
                  "ownerId",
                  "chat_type",
                  "status",
                ],
                {
                  unique: false,
                }
              );
            }

            if (
              !messageStore.indexNames.contains(
                "created_at"
              )
            ) {

              messageStore.createIndex(
                "created_at",
                "created_at",
                {
                  unique: false,
                }
              );
            }

            if (
              !db.objectStoreNames.contains(
                CHAT_STORE
              )
            ) {

              db.createObjectStore(
                CHAT_STORE,
                {
                  keyPath:
                    "chatId",
                }
              );
            }
  
            if (!db.objectStoreNames.contains(CHAT_READ)) {
              db.createObjectStore(CHAT_READ, {
                keyPath: "id",
              });
            }

            if (
              !db.objectStoreNames.contains(
                COMMUNITY_STORE
              )
            ) {

              db.createObjectStore(
                COMMUNITY_STORE,
                {
                  keyPath:
                    "communityId",
                }
              );
            }
  
            if (
              !messageStore.indexNames.contains(
                "by_community_owner_id"
              )
            ) {
              messageStore.createIndex(
                "by_community_owner_id",
                [
                  "communityId",
                  "ownerId",
                  "chat_type",
                  "id",
                ],
                {
                  unique: false,
                }
              );
            }

            if (
              !db.objectStoreNames.contains(
                CHAT_DRAFT_STORE
              )
            ) {

              db.createObjectStore(
                CHAT_DRAFT_STORE,
                {
                  keyPath:
                    "chatId",
                }
              );
            }

            if (
              !db.objectStoreNames.contains(
                COMMUNITY_DRAFT_STORE
              )
            ) {

              db.createObjectStore(
                COMMUNITY_DRAFT_STORE,
                {
                  keyPath:
                    "communityId",
                }
              );
            }

            if (
              !db.objectStoreNames.contains(
                POST_DRAFT_STORE
              )
            ) {

              db.createObjectStore(
                POST_DRAFT_STORE,
                {
                  keyPath:
                    "draftId",
                }
              );
            }

            if (
              !db.objectStoreNames.contains(
                CHAT_SCROLL_STORE
              )
            ) {

              db.createObjectStore(
                CHAT_SCROLL_STORE,
                {
                  keyPath:
                    "id",
                }
              );
            }

            if (
              !db.objectStoreNames.contains(
                OUTBOX_STORE
              )
            ) {

              const outbox =
                db.createObjectStore(
                  OUTBOX_STORE,
                  {
                    keyPath:
                      "client_id",
                  }
                );

              outbox.createIndex(
                "by_owner_status",
                [
                  "ownerId",
                  "status",
                ],
                {
                  unique: false,
                }
              );

              outbox.createIndex(
                "by_retry",
                [
                  "status",
                  "next_attempt_at",
                ],
                {
                  unique: false,
                }
              );
            }
          },

          blocked() {

            console.warn(
              "[IndexedDB] DB blocked — close other tabs"
            );
          },

          blocking() {

            console.warn(
              "[IndexedDB] Closing old DB connection"
            );
          },

          terminated() {

            console.warn(
              "[IndexedDB] DB connection terminated"
            );

            dbPromise = null;
          },
        }
      );
  }

  return dbPromise;
}

export async function resetDatabase() {

  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {

    if (dbPromise) {

      const db =
        await dbPromise;

      db.close();

      dbPromise = null;
    }


    await new Promise<void>(
      (
        resolve,
        reject
      ) => {

        const request =
          indexedDB.deleteDatabase(
            DB_NAME
          );

        request.onsuccess =
          () => resolve();

        request.onerror =
          () =>
            reject(
              request.error
            );

        request.onblocked =
          () =>
            console.warn(
              "[IndexedDB] Reset blocked"
            );
      }
    );


    console.log(
      "[IndexedDB] Database reset"
    );

  } catch (error) {

    console.error(
      "[IndexedDB] Reset failed",
      error
    );
  }
}