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

function feedKey(
    filter: string,
    tribeId: number | null,
    page: number
) {
    return `${filter}_${tribeId ?? "all"}_page_${page}`;
}

function reelsKey(
    filter: string,
    tribeId: number | null
) {
    return `${filter}_${tribeId ?? "all"}_reels`;
}

// ==========================
// POSTS
// ==========================
export async function saveFeed(
    filter: string,
    tribeId: number | null,
    page: number,
    posts: any[]
) {
    const db = await getDB();
    if (!db) return;

    await db.put(
        "feed",
        posts,
        feedKey(filter, tribeId, page)
    );
}

export async function getFeed(
    filter: string,
    tribeId: number | null,
    page: number
) {
    const db = await getDB();
    if (!db) return [];

    return (
        await db.get(
            "feed",
            feedKey(filter, tribeId, page)
        )
    ) || [];
}

export async function clearFeed(
    filter: string,
    tribeId: number | null
) {
    const db = await getDB();
    if (!db) return;

    const keys = await db.getAllKeys("feed");

    for (const key of keys) {
        if (
            String(key).startsWith(
                `${filter}_${tribeId ?? "all"}`
            )
        ) {
            await db.delete("feed", key);
        }
    }
}

// ==========================
// REELS
// ==========================

export async function saveReels(
    filter: string,
    tribeId: number | null,
    reels: any[]
) {
    const db = await getDB();
    if (!db) return;

    await db.put(
        "reels",
        reels,
        reelsKey(filter, tribeId)
    );
}

export async function getReels(
    filter: string,
    tribeId: number | null,
) {
    const db = await getDB();
    if (!db) return [];

    return (
        await db.get(
            "reels",
            reelsKey(filter, tribeId)
        )
    ) || [];
}

export async function clearReels(
    filter: string,
    tribeId: number | null
) {
    const db = await getDB();
    if (!db) return;

    const keys = await db.getAllKeys("reels");

    for (const key of keys) {
        if (
            String(key).startsWith(
                `${filter}_${tribeId ?? "all"}`
            )
        ) {
            await db.delete("reels", key);
        }
    }
}