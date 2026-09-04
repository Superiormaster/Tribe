import { openDB } from "idb";

const DB_NAME = "tribe-notifications-db";
const DB_VERSION = 1;
const STORE_NAME = "state";

let dbPromise: ReturnType<typeof openDB> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  return dbPromise;
}

function getAccountKey() {
  const account = localStorage.getItem("active_account");

  if (!account) {
    return null;
  }

  return `notification_page_opened_${account}`;
}

export async function getNotificationPageOpened() {
  const db = await getDB();

  if (!db) return null;

  const key = getAccountKey();

  if (!key) return null;

  return db.get(STORE_NAME, key);
}

export async function setNotificationPageOpened(
  value: boolean
) {
  const db = await getDB();

  if (!db) return;

  const key = getAccountKey();

  if (!key) return;

  await db.put(STORE_NAME, value, key);
}

export async function clearNotificationPageOpened() {
  const db = await getDB();

  if (!db) return;

  const key = getAccountKey();

  if (!key) return;

  await db.delete(STORE_NAME, key);
}