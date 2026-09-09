import {
  openDB,
  unwrap,
} from "idb";

import type {
  DBSchema,
  IDBPDatabase,
} from "idb";

const DB_VERSION = 23;
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
      account_message_key: string;

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

      client_created_at?: string;
      server_created_at?: string;

      files?: any[];
      reactions?: any[];

      hidden_for?: number[];

      is_deleted?: boolean;

      deleted_by_admin?: boolean;
      deleted_at?: string | null;

      delivered_to?: number[];
      seen_by?: number[];
      read_by?: number[];

      reply_to?: any;
      reply_to_id?: number | null;
      reply_to_client_id?: string | null;

      mentions?: any[];

      media_assets?: any[];

      preview?: any;

      [key: string]: any;
    };

    indexes: {
      by_chat_owner: [
        number,
        number,
        ChatType
      ];

      by_chat_owner_id: [
        number,
        number,
        ChatType,
        number
      ];

      by_community_owner_id: [
        number,
        number,
        ChatType,
        number
      ];

      by_owner_status: [
        number,
        string
      ];

      by_owner_client: [
        number,
        string
      ];

      by_owner_type_status: [
        number,
        ChatType,
        string
      ];

      by_chat_owner_server: [
        number,
        number,
        ChatType,
        number
      ];

      created_at: string;
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
    key: number;

    value: {
      ownerId: number;
      nextSequence: number;

      [key: string]: any;
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

      chat_type:
        | "private"
        | "community";

      processing_at?:
        | number
        | null;

      status:
        | "pending"
        | "processing"
        | "failed";

      attempts: number;

      next_attempt_at: number;

      created_at: number;

      last_error?:
        | string
        | null;
    };

    indexes: {
      by_owner_status: [
        number,
        OutboxStatus
      ];

      by_retry: [
        OutboxStatus,
        number
      ];
    };
  };
}

function createMessageIndexes(
  store: IDBObjectStore
) {
  if (
    !store.indexNames.contains(
      "by_chat_owner"
    )
  ) {
    store.createIndex(
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
    !store.indexNames.contains(
      "by_chat_owner_id"
    )
  ) {
    store.createIndex(
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
    !store.indexNames.contains(
      "by_chat_owner_server"
    )
  ) {
    store.createIndex(
      "by_chat_owner_server",
      [
        "chat",
        "ownerId",
        "chat_type",
        "server_id",
      ],
      {
        unique: false,
      }
    );
  }

  if (
    !store.indexNames.contains(
      "by_community_owner_id"
    )
  ) {
    store.createIndex(
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
    !store.indexNames.contains(
      "by_owner_status"
    )
  ) {
    store.createIndex(
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
    !store.indexNames.contains(
      "by_owner_client"
    )
  ) {
    store.createIndex(
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
    !store.indexNames.contains(
      "by_owner_type_status"
    )
  ) {
    store.createIndex(
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
    !store.indexNames.contains(
      "created_at"
    )
  ) {
    store.createIndex(
      "created_at",
      "created_at",
      {
        unique: false,
      }
    );
  }
}

function ensureMessagesStoreIndexes(
  transaction: IDBTransaction
) {
  const store =
    transaction.objectStore(
      MESSAGE_STORE
    );

  createMessageIndexes(
    store
  );

  console.log(
    "[IDB MIGRATION] Messages indexes verified:",
    Array.from(store.indexNames)
  );
}

function ensureOutboxIndexes(
  transaction: IDBTransaction
) {
  const store =
    transaction.objectStore(
      OUTBOX_STORE
    );

  if (
    !store.indexNames.contains(
      "by_owner_status"
    )
  ) {
    store.createIndex(
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
    !store.indexNames.contains(
      "by_retry"
    )
  ) {
    store.createIndex(
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

  console.log(
    "[IDB MIGRATION] Outbox indexes verified:",
    Array.from(store.indexNames)
  );
}

function normalizeMigratedMessage(
  message: any
) {
  const ownerId =
    Number(
      message?.ownerId
    );

  if (
    !Number.isFinite(
      ownerId
    ) ||
    ownerId <= 0
  ) {
    return null;
  }

  const clientId =
    message?.client_id ??
    (
      message?.server_id != null
        ? `server-${message.server_id}`
        : message?.id != null
          ? `server-${message.id}`
          : null
    );

  if (!clientId) {
    return null;
  }

  const accountMessageKey =
    `${ownerId}:${clientId}`;

  return {
    ...message,

    client_id:
      clientId,

    ownerId,

    account_message_key:
      accountMessageKey,

    hidden_for:
      Array.isArray(
        message?.hidden_for
      )
        ? message.hidden_for
        : [],

    reactions:
      Array.isArray(
        message?.reactions
      )
        ? message.reactions
        : [],

    files:
      Array.isArray(
        message?.files
      )
        ? message.files
        : [],

    media_url:
      Array.isArray(
        message?.media_url
      )
        ? message.media_url
        : message?.media_url
          ? [message.media_url]
          : [],

    thumbnail:
      Array.isArray(
        message?.thumbnail
      )
        ? message.thumbnail
        : message?.thumbnail
          ? [message.thumbnail]
          : [],

    duration:
      Array.isArray(
        message?.duration
      )
        ? message.duration
        : message?.duration != null
          ? [Number(message.duration)]
          : [],

    chat_type:
      message?.chat_type ===
      "private"
        ? "private"
        : "community",
  };
}

function migrateMessagesStore(
  db: IDBDatabase,
  transaction: IDBTransaction,
  oldVersion: number
) {
  console.log(
    "[IDB MIGRATION] Checking messages store",
    {
      oldVersion,
      targetVersion:
        DB_VERSION,
    }
  );

  const hasMessages =
    db.objectStoreNames.contains(
      MESSAGE_STORE
    );

  if (!hasMessages) {
    console.log(
      "[IDB MIGRATION] Creating fresh messages store"
    );

    const store =
      db.createObjectStore(
        MESSAGE_STORE,
        {
          keyPath:
            "account_message_key",
        }
      );

    createMessageIndexes(
      store
    );

    console.log(
      "[IDB MIGRATION] Fresh messages store created"
    );

    return;
  }

  const oldStore =
    transaction.objectStore(
      MESSAGE_STORE
    );

  const currentKeyPath =
    oldStore.keyPath;

  console.log(
    "[IDB MIGRATION] Existing messages keyPath:",
    currentKeyPath
  );

  if (
    currentKeyPath ===
    "account_message_key"
  ) {
    console.log(
      "[IDB MIGRATION] messages already uses account_message_key"
    );

    createMessageIndexes(
      oldStore
    );

    return;
  }

  console.log(
    "[IDB MIGRATION] Legacy messages keyPath detected. Rebuilding store.",
    {
      currentKeyPath,
    }
  );

  const request =
    oldStore.getAll();

  request.onsuccess =
    () => {
      try {
        const oldMessages =
          request.result || [];

        console.log(
          `[IDB MIGRATION] Found ${oldMessages.length} legacy messages`
        );

        const migratedMessages =
          oldMessages
            .map(
              (
                message: any
              ) =>
                normalizeMigratedMessage(
                  message
                )
            )
            .filter(
              (
                message
              ): message is Record<
                string,
                any
              > =>
                Boolean(
                  message
                )
            );

        db.deleteObjectStore(
          MESSAGE_STORE
        );

        const newStore =
          db.createObjectStore(
            MESSAGE_STORE,
            {
              keyPath:
                "account_message_key",
            }
          );

        createMessageIndexes(
          newStore
        );

        let restoredCount =
          0;

        /*
         * Restore every valid message.
         */
        for (
          const message
          of migratedMessages
        ) {
          try {
            newStore.put(
              message
            );

            restoredCount++;
          } catch (
            error
          ) {
            console.error(
              "[IDB MIGRATION] Failed restoring message",
              {
                error,
                id:
                  message?.id,
                client_id:
                  message?.client_id,
              }
            );
          }
        }

        console.log(
          "[IDB MIGRATION] messages store rebuilt successfully",
          {
            found:
              oldMessages.length,

            migrated:
              migratedMessages.length,

            restored:
              restoredCount,

            indexes:
              Array.from(
                newStore.indexNames
              ),
          }
        );
      } catch (
        error
      ) {
        console.error(
          "[IDB MIGRATION] Message store migration failed",
          error
        );

        try {
          transaction.abort();
        } catch (
          abortError
        ) {
          console.error(
            "[IDB MIGRATION] Failed to abort migration",
            abortError
          );
        }
      }
    };

  request.onerror =
    () => {
      console.error(
        "[IDB MIGRATION] Failed reading legacy messages",
        request.error
      );

      try {
        transaction.abort();
      } catch (
        abortError
      ) {
        console.error(
          "[IDB MIGRATION] Failed to abort migration",
          abortError
        );
      }
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

            const nativeDB =
              unwrap(db);

            const nativeTransaction =
              unwrap(transaction);

            migrateMessagesStore(
              nativeDB,
              nativeTransaction,
              oldVersion
            );

            if (
              nativeDB.objectStoreNames.contains(
                MESSAGE_STORE
              )
            ) {
              const messagesStore =
                nativeTransaction.objectStore(
                  MESSAGE_STORE
                );

              if (
                messagesStore.keyPath ===
                "account_message_key"
              ) {
                ensureMessagesStoreIndexes(
                  nativeTransaction
                );
              }
            }

            if (
              !nativeDB.objectStoreNames.contains(
                MESSAGE_SEQUENCE_STORE
              )
            ) {
              nativeDB.createObjectStore(
                MESSAGE_SEQUENCE_STORE,
                {
                  keyPath:
                    "ownerId",
                }
              );

              console.log(
                "[IDB MIGRATION] Created message_sequence store"
              );
            }

            if (
              !nativeDB.objectStoreNames.contains(
                CHAT_STORE
              )
            ) {
              nativeDB.createObjectStore(
                CHAT_STORE,
                {
                  keyPath:
                    "chatId",
                }
              );

              console.log(
                "[IDB MIGRATION] Created chats store"
              );
            }

            if (
              !nativeDB.objectStoreNames.contains(
                CHAT_READ
              )
            ) {
              nativeDB.createObjectStore(
                CHAT_READ,
                {
                  keyPath:
                    "id",
                }
              );

              console.log(
                "[IDB MIGRATION] Created chat_read store"
              );
            }

            if (
              !nativeDB.objectStoreNames.contains(
                COMMUNITY_STORE
              )
            ) {
              nativeDB.createObjectStore(
                COMMUNITY_STORE,
                {
                  keyPath:
                    "communityId",
                }
              );

              console.log(
                "[IDB MIGRATION] Created communities store"
              );
            }

            if (
              !nativeDB.objectStoreNames.contains(
                CHAT_DRAFT_STORE
              )
            ) {
              nativeDB.createObjectStore(
                CHAT_DRAFT_STORE,
                {
                  keyPath:
                    "chatId",
                }
              );

              console.log(
                "[IDB MIGRATION] Created drafts store"
              );
            }

            if (
              !nativeDB.objectStoreNames.contains(
                COMMUNITY_DRAFT_STORE
              )
            ) {
              nativeDB.createObjectStore(
                COMMUNITY_DRAFT_STORE,
                {
                  keyPath:
                    "communityId",
                }
              );

              console.log(
                "[IDB MIGRATION] Created community_drafts store"
              );
            }

            if (
              !nativeDB.objectStoreNames.contains(
                POST_DRAFT_STORE
              )
            ) {
              nativeDB.createObjectStore(
                POST_DRAFT_STORE,
                {
                  keyPath:
                    "draftId",
                }
              );

              console.log(
                "[IDB MIGRATION] Created post_drafts store"
              );
            }

            if (
              !nativeDB.objectStoreNames.contains(
                CHAT_SCROLL_STORE
              )
            ) {
              nativeDB.createObjectStore(
                CHAT_SCROLL_STORE,
                {
                  keyPath:
                    "id",
                }
              );

              console.log(
                "[IDB MIGRATION] Created chat_scroll store"
              );
            }

            /*
             * --------------------------------------------------
             * OUTBOX
             * --------------------------------------------------
             */
            let outbox:
              | IDBObjectStore;

            if (
              nativeDB.objectStoreNames.contains(
                OUTBOX_STORE
              )
            ) {
              outbox =
                nativeTransaction.objectStore(
                  OUTBOX_STORE
                );
            } else {
              outbox =
                nativeDB.createObjectStore(
                  OUTBOX_STORE,
                  {
                    keyPath:
                      "client_id",
                  }
                );

              console.log(
                "[IDB MIGRATION] Created message_outbox store"
              );
            }

            /*
             * Repair outbox indexes.
             */
            ensureOutboxIndexes(
              nativeTransaction
            );

            console.log(
              "[IndexedDB] Upgrade callback completed",
              {
                version:
                  DB_VERSION,
              }
            );
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

            dbPromise =
              null;
          },
        }
      );
  }

  return dbPromise;
}

/* ============================================================
 * DATABASE RESET
 * ========================================================== */

export async function resetDatabase() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    /*
     * Close our current connection first.
     */
    if (dbPromise) {
      try {
        const db =
          await dbPromise;

        db.close();
      } catch (
        error
      ) {
        console.warn(
          "[IndexedDB] Could not close existing connection",
          error
        );
      }

      dbPromise =
        null;
    }

    /*
     * Delete the complete database.
     */
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
          () => {
            console.log(
              "[IndexedDB] Database reset"
            );

            resolve();
          };

        request.onerror =
          () => {
            console.error(
              "[IndexedDB] Database reset failed",
              request.error
            );

            reject(
              request.error
            );
          };

        request.onblocked =
          () => {
            console.warn(
              "[IndexedDB] Reset blocked — another tab/window still has the database open"
            );
          };
      }
    );
  } catch (
    error
  ) {
    console.error(
      "[IndexedDB] Reset failed",
      error
    );
  }
}