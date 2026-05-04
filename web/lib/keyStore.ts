import { openDB } from "idb";

let dbPromise: any = null;

function getDB() {
  if (typeof window === "undefined") return null;

  if (!dbPromise) {
    dbPromise = openDB("auth-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys");
        }

        if (!db.objectStoreNames.contains("tokens")) {
          db.createObjectStore("tokens");
        }
      },
    });
  }

  return dbPromise;
}

export async function storeRefreshToken(email: string, token: string) {
  const db = await getDB();
  if (!db) return;

  await db.put("tokens", token, `refresh_${email}`);
}

export async function getRefreshToken() {
  const db = await getDB();
  if (!db) return null;
  
  const email = localStorage.getItem("active_account");
  if (!email) return null;

  return db.get("tokens", `refresh_${email}`);
}

export async function clearTokens() {
  const db = await getDB();
  if (!db) return;
  
  const email = localStorage.getItem("active_account");
  if (!email) return null;

  await db.delete("tokens", `refresh_${email}`);
}

// =========================
// STORE PRIVATE KEY
// =========================
export async function storePrivateKey(base64: string) {
  const db = await getDB();
  if (!db) return;

  await db.put("keys", base64, "private");
}

// =========================
// GET PRIVATE KEY
// =========================
export async function getPrivateKey() {
  const db = await getDB();
  if (!db) return null;

  return db.get("keys", "private");
}

// =========================
// CLEAR KEYS (LOGOUT)
// =========================
export async function clearKeys() {
  const db = await getDB();
  if (!db) return;

  await db.delete("keys", "private");
}