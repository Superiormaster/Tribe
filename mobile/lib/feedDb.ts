import * as SQLite from "expo-sqlite";

const DB_NAME = "feed-db";
const DB_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS feed (
          cache_key TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS reels (
          cache_key TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        );

        PRAGMA user_version = ${DB_VERSION};
      `);

      return db;
    })();
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

function serialize(value: any) {
  return JSON.stringify(value ?? []);
}

function deserialize<T = any>(value: string | null | undefined): T {
  if (!value) return [] as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return [] as T;
  }
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

  const cleanPosts = (posts || []).filter(
    (post) => post && typeof post === "object"
  );

  await db.runAsync(
    `
      INSERT OR REPLACE INTO feed (
        cache_key,
        data
      )
      VALUES (?, ?)
    `,
    feedKey(filter, tribeId, page),
    serialize(cleanPosts)
  );
}

export async function updateFeedPost(
  postId: number,
  updates: Partial<any>
) {
  const db = await getDB();

  const rows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM feed
    `
  );

  for (const row of rows) {
    const posts = deserialize<any[]>(row.data);

    if (!Array.isArray(posts)) continue;

    let changed = false;

    const updated = posts
      .filter(
        (post) =>
          post &&
          typeof post === "object"
      )
      .map((post) => {
        if (post.id !== postId) {
          return post;
        }

        changed = true;

        return {
          ...post,
          ...updates,
        };
      });

    if (changed) {
      await db.runAsync(
        `
          UPDATE feed
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(updated),
        row.cache_key
      );
    }
  }
}

export async function removeFeedPost(
  postId: number
) {
  const db = await getDB();

  const id = Number(postId);

  const rows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM feed
    `
  );

  for (const row of rows) {
    const posts = deserialize<any[]>(row.data);

    if (!Array.isArray(posts)) continue;

    const filtered = posts.filter(
      (post: any) =>
        post &&
        typeof post === "object" &&
        Number(post.id) !== id
    );

    if (filtered.length !== posts.length) {
      await db.runAsync(
        `
          UPDATE feed
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(filtered),
        row.cache_key
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

  const key = feedKey(
    filter,
    tribeId,
    1
  );

  const row = await db.getFirstAsync<{
    data: string;
  }>(
    `
      SELECT data
      FROM feed
      WHERE cache_key = ?
    `,
    key
  );

  const posts = deserialize<any[]>(
    row?.data
  );

  const exists = posts.some(
    (p: any) =>
      p.id === post.id ||
      p.reactKey === post.reactKey
  );

  if (exists) return;

  await db.runAsync(
    `
      INSERT OR REPLACE INTO feed (
        cache_key,
        data
      )
      VALUES (?, ?)
    `,
    key,
    serialize([post, ...posts])
  );
}

export async function getFeed(
  filter: string,
  tribeId: number | null,
  page: number
) {
  const db = await getDB();

  const row = await db.getFirstAsync<{
    data: string;
  }>(
    `
      SELECT data
      FROM feed
      WHERE cache_key = ?
    `,
    feedKey(filter, tribeId, page)
  );

  return deserialize<any[]>(
    row?.data
  );
}

export async function clearFeed(
  filter: string,
  tribeId: number | null
) {
  const db = await getDB();

  const prefix =
    `${filter}_${tribeId ?? "all"}`;

  await db.runAsync(
    `
      DELETE FROM feed
      WHERE cache_key LIKE ?
    `,
    `${prefix}%`
  );
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

  const cleanReels = (reels || []).filter(
    (reel) =>
      reel &&
      typeof reel === "object"
  );

  await db.runAsync(
    `
      INSERT OR REPLACE INTO reels (
        cache_key,
        data
      )
      VALUES (?, ?)
    `,
    reelsKey(filter, tribeId),
    serialize(cleanReels)
  );
}

export async function updateReel(
  reelId: number,
  updates: Partial<any>
) {
  const db = await getDB();

  const rows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM reels
    `
  );

  for (const row of rows) {
    const reels = deserialize<any[]>(
      row.data
    );

    if (!Array.isArray(reels)) continue;

    let changed = false;

    const updated = reels
      .filter(
        (reel: any) =>
          reel &&
          typeof reel === "object"
      )
      .map((reel: any) => {
        if (reel.id !== reelId) {
          return reel;
        }

        changed = true;

        return {
          ...reel,
          ...updates,
        };
      });

    if (changed) {
      await db.runAsync(
        `
          UPDATE reels
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(updated),
        row.cache_key
      );
    }
  }
}

export async function removeReel(
  reelId: number
) {
  const db = await getDB();

  const rows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM reels
    `
  );

  for (const row of rows) {
    const reels = deserialize<any[]>(
      row.data
    );

    if (!Array.isArray(reels)) continue;

    const filtered = reels.filter(
      (reel: any) =>
        reel &&
        typeof reel === "object" &&
        reel.id !== reelId
    );

    if (filtered.length !== reels.length) {
      await db.runAsync(
        `
          UPDATE reels
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(filtered),
        row.cache_key
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

  const key = reelsKey(
    filter,
    tribeId
  );

  const row = await db.getFirstAsync<{
    data: string;
  }>(
    `
      SELECT data
      FROM reels
      WHERE cache_key = ?
    `,
    key
  );

  const reels = deserialize<any[]>(
    row?.data
  );

  if (
    reels.some(
      (r: any) => r.id === reel.id
    )
  ) {
    return;
  }

  await db.runAsync(
    `
      INSERT OR REPLACE INTO reels (
        cache_key,
        data
      )
      VALUES (?, ?)
    `,
    key,
    serialize([reel, ...reels])
  );
}

export async function getReels(
  filter: string,
  tribeId: number | null
) {
  const db = await getDB();

  const row = await db.getFirstAsync<{
    data: string;
  }>(
    `
      SELECT data
      FROM reels
      WHERE cache_key = ?
    `,
    reelsKey(filter, tribeId)
  );

  return deserialize<any[]>(
    row?.data
  );
}

export async function clearReels(
  filter: string,
  tribeId: number | null
) {
  const db = await getDB();

  const prefix =
    `${filter}_${tribeId ?? "all"}`;

  await db.runAsync(
    `
      DELETE FROM reels
      WHERE cache_key LIKE ?
    `,
    `${prefix}%`
  );
}

// ==========================
// REMOVE BY USER
// ==========================

export async function removePostsByUser(
  userId: number
) {
  const db = await getDB();

  const rows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM feed
    `
  );

  for (const row of rows) {
    const posts = deserialize<any[]>(
      row.data
    );

    if (!Array.isArray(posts)) continue;

    const filtered = posts.filter(
      (item: any) => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return false;
        }

        const ownerId =
          item?.user?.id ??
          item?.post?.user?.id ??
          item?.data?.user?.id ??
          item?.data?.post?.user?.id;

        return (
          Number(ownerId) !==
          Number(userId)
        );
      }
    );

    if (filtered.length !== posts.length) {
      await db.runAsync(
        `
          UPDATE feed
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(filtered),
        row.cache_key
      );
    }
  }
}

export async function removeReelsByUser(
  userId: number
) {
  const db = await getDB();

  const rows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM reels
    `
  );

  for (const row of rows) {
    const reels = deserialize<any[]>(
      row.data
    );

    if (!Array.isArray(reels)) continue;

    const filtered = reels.filter(
      (reel: any) => {
        return !(
          reel?.user?.id &&
          Number(reel.user.id) ===
            Number(userId)
        );
      }
    );

    if (filtered.length !== reels.length) {
      await db.runAsync(
        `
          UPDATE reels
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(filtered),
        row.cache_key
      );
    }
  }
}

// ==========================
// REMOVE POST FROM ALL FEED
// ==========================

export async function removePostFromAllFeedCaches(
  postId: number
) {
  const db = await getDB();

  const id = Number(postId);

  if (!id) return;

  const feedRows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM feed
    `
  );

  for (const row of feedRows) {
    const posts = deserialize<any[]>(
      row.data
    );

    if (!Array.isArray(posts)) continue;

    const filtered = posts.filter(
      (item: any) => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return false;
        }

        if (
          item.id &&
          Number(item.id) === id &&
          item.type !== "repost" &&
          item.feed_type !== "repost" &&
          item.type !== "share" &&
          item.feed_type !== "share"
        ) {
          return false;
        }

        if (
          item.type === "repost" ||
          item.feed_type === "repost"
        ) {
          const originalPostId =
            Number(
              item.post?.id ??
              item.post_id ??
              item.original_post_id
            );

          if (
            originalPostId === id
          ) {
            return false;
          }
        }

        if (
          item.type === "share" ||
          item.feed_type === "share"
        ) {
          const originalPostId =
            Number(
              item.post?.id ??
              item.post_id ??
              item.original_post_id
            );

          if (
            originalPostId === id
          ) {
            return false;
          }
        }

        return true;
      }
    );

    if (filtered.length !== posts.length) {
      await db.runAsync(
        `
          UPDATE feed
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(filtered),
        row.cache_key
      );
    }
  }

  // Remove matching reel too.
  const reelRows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM reels
    `
  );

  for (const row of reelRows) {
    const reels = deserialize<any[]>(
      row.data
    );

    if (!Array.isArray(reels)) continue;

    const filtered = reels.filter(
      (reel: any) => {
        if (
          !reel ||
          typeof reel !== "object"
        ) {
          return false;
        }

        return Number(reel.id) !== id;
      }
    );

    if (filtered.length !== reels.length) {
      await db.runAsync(
        `
          UPDATE reels
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(filtered),
        row.cache_key
      );
    }
  }
}

// ==========================
// REMOVE REPOST
// ==========================

export async function removeRepostFromAllFeedCaches(
  repostId: number
) {
  const db = await getDB();

  const id = Number(repostId);

  if (!id) return;

  const rows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM feed
    `
  );

  for (const row of rows) {
    const posts = deserialize<any[]>(
      row.data
    );

    if (!Array.isArray(posts)) continue;

    const filtered = posts.filter(
      (item: any) => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return false;
        }

        const isRepost =
          item.type === "repost" ||
          item.feed_type === "repost";

        if (!isRepost) {
          return true;
        }

        return Number(item.id) !== id;
      }
    );

    if (filtered.length !== posts.length) {
      await db.runAsync(
        `
          UPDATE feed
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(filtered),
        row.cache_key
      );
    }
  }
}

// ==========================
// REMOVE SHARE
// ==========================

export async function removeShareFromAllFeedCaches(
  shareId: number
) {
  const db = await getDB();

  const id = Number(shareId);

  if (!id) return;

  const rows = await db.getAllAsync<{
    cache_key: string;
    data: string;
  }>(
    `
      SELECT cache_key, data
      FROM feed
    `
  );

  for (const row of rows) {
    const posts = deserialize<any[]>(
      row.data
    );

    if (!Array.isArray(posts)) continue;

    const filtered = posts.filter(
      (item: any) => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return false;
        }

        const isShare =
          item.type === "share" ||
          item.feed_type === "share";

        if (!isShare) {
          return true;
        }

        return Number(item.id) !== id;
      }
    );

    if (filtered.length !== posts.length) {
      await db.runAsync(
        `
          UPDATE feed
          SET data = ?
          WHERE cache_key = ?
        `,
        serialize(filtered),
        row.cache_key
      );
    }
  }
}