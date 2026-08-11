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

    const cleanPosts = (posts || []).filter(
        (post) => post && typeof post === "object"
    );

    await db.put(
        "feed",
        cleanPosts,
        feedKey(filter, tribeId, page)
    );
}

export async function updateFeedPost(
  postId: number,
  updates: Partial<any>
) {
  const db = await getDB();
  if (!db) return;

  const keys = await db.getAllKeys("feed");

  for (const key of keys) {
    const posts = await db.get("feed", key);

    if (!Array.isArray(posts)) continue;

    let changed = false;

    const updated = posts
      .filter((post) => post && typeof post === "object")
      .map((post) => {
        if (post.id !== postId) return post;

        changed = true;

        return {
          ...post,
          ...updates,
        };
      });

    if (changed) {
      await db.put("feed", updated, key);
    }
  }
}

export async function removeFeedPost(
    postId: number
) {
    const db = await getDB();
    if (!db) return;

    const keys = await db.getAllKeys("feed");

    for (const key of keys) {

        const posts =
            (await db.get("feed", key)) || [];

        const filtered = posts.filter(
          (post: any) =>
              post &&
              typeof post === "object" &&
              post.id !== postId
        );

        if (filtered.length !== posts.length) {
            await db.put(
                "feed",
                filtered,
                key
            );
        }
    }
}

export async function insertFeedPost(
    filter: string,
    tribeId: number | null,
    post: any
) {
    const db = await getDB();
    if (!db) return;

    const key = feedKey(
        filter,
        tribeId,
        1
    );

    const posts =
        (await db.get("feed", key)) || [];

    const exists = posts.some(
        (p: any) =>
            p.id === post.id ||
            p.reactKey === post.reactKey
    );

    if (exists) return;

    await db.put(
        "feed",
        [post, ...posts],
        key
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

    const cleanReels = (reels || []).filter(
        (reel) => reel && typeof reel === "object"
    );

    await db.put(
        "reels",
        cleanReels,
        reelsKey(filter, tribeId)
    );
}

export async function updateReel(
    reelId: number,
    updates: Partial<any>
) {
    const db = await getDB();
    if (!db) return;

    const keys =
        await db.getAllKeys("reels");

    for (const key of keys) {

        const reels =
            (await db.get("reels", key)) || [];

        let changed = false;

        const updated = reels
          .filter((reel) => reel && typeof reel === "object")
          .map((reel) => {
              if (reel.id !== reelId) return reel;
        
              changed = true;
        
              return {
                  ...reel,
                  ...updates,
              };
          });

        if (changed) {
            await db.put(
                "reels",
                updated,
                key
            );
        }
    }
}

export async function removeReel(
    reelId: number
) {
    const db = await getDB();
    if (!db) return;

    const keys =
        await db.getAllKeys("reels");

    for (const key of keys) {

        const reels =
            (await db.get("reels", key)) || [];

        const filtered = reels.filter(
          (reel: any) =>
              reel &&
              typeof reel === "object" &&
              reel.id !== reelId
        );

        if (filtered.length !== reels.length) {
            await db.put(
                "reels",
                filtered,
                key
            );
        }
    }
}

export async function insertReel(
    filter: string,
    tribeId: number | null,
    reel: any
) {
    const db = await getDB();
    if (!db) return;

    const key = reelsKey(
        filter,
        tribeId
    );

    const reels =
        (await db.get("reels", key)) || [];

    if (
        reels.some(
            (r: any) => r.id === reel.id
        )
    ) {
        return;
    }

    await db.put(
        "reels",
        [reel, ...reels],
        key
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