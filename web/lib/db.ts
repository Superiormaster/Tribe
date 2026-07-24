import { openDB } from "idb";
import type { Message } from "@/utils/chat/messageContract";

const DB_VERSION = 9;
const DB_NAME = "tribe-chat-db";

export const MESSAGE_STORE = "messages";
export const COMMUNITY_STORE = "communitychats";
export const CHAT_DRAFT_STORE = "chat_drafts";
export const COMMUNITY_DRAFT_STORE = "community_drafts";
export const CHAT_STORE = "chats";
export const POST_DRAFT_STORE = "post_drafts";

export let dbPromise: any;

export function getDB() {

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
          // COMMUNITY STORE
          // =====================

          if (
            !db.objectStoreNames.contains(
              COMMUNITY_STORE
            )
          ) {

            db.createObjectStore(
              COMMUNITY_STORE,
              {
                keyPath: "communityId",
              }
            );
          }

          // =====================
          // CHAT DRAFT STORE
          // =====================

          if (
            !db.objectStoreNames.contains(
              CHAT_DRAFT_STORE
            )
          ) {

            db.createObjectStore(
              CHAT_DRAFT_STORE,
              {
                keyPath: "chatId",
              }
            );
          }
  
          // =====================
          // COMMUNITY DRAFT STORE
          // =====================

          if (
            !db.objectStoreNames.contains(
              COMMUNITY_DRAFT_STORE
            )
          ) {

            db.createObjectStore(
              COMMUNITY_DRAFT_STORE,
              {
                keyPath: "communityId",
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