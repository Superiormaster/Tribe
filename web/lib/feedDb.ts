import { openDB } from "idb";

let dbPromise: any = null;

function getDB() {
  if (typeof window === "undefined") return null;

  if (!dbPromise) {
    dbPromise = openDB("feed-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("feed")) {
          db.createObjectStore("feed");
        }

        if (!db.objectStoreNames.contains("reels")) {
          db.createObjectStore("reels");
        }
      },
    });
  }

  return dbPromise;
}

// ==========================
// POSTS
// ==========================
export async function saveFeed(page: number, posts: any[]) {
  const db = await getDB();
  if (!db) return;

  await db.put("feed", posts, `page_${page}`);
}

export async function getFeed(page: number) {
  const db = await getDB();
  if (!db) return [];

  return (await db.get("feed", `page_${page}`)) || [];
}

export async function clearFeed() {
  const db = await getDB();
  if (!db) return;

  await db.delete("feed", "home_feed");
}

// ==========================
// REELS
// ==========================

export async function saveReels(reels: any[]) {
  const db = await getDB();
  if (!db) return;

  await db.put("reels", reels, "home_reels");
}

export async function getReels() {
  const db = await getDB();
  if (!db) return [];

  return (await db.get("reels", "home_reels")) || [];
}

export async function clearReels() {
  const db = await getDB();
  if (!db) return;

  await db.delete("reels", "home_reels");
}