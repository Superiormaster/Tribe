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

// =========================
// STORE REFRESH TOKEN
// =========================
export async function storeRefreshToken(
  email: string,
  token: string
) {
  const db = await getDB();
  if (!db) return;

  await db.put(
    "tokens",
    token,
    `refresh_${email}`
  );
}

// =========================
// GET REFRESH TOKEN
// =========================
export async function getRefreshToken(
  email?: string
) {
  const db = await getDB();
  if (!db) return null;

  const selected =
    email ||
    localStorage.getItem(
      "active_account"
    );

  if (!selected) return null;

  return db.get(
    "tokens",
    `refresh_${selected}`
  );
}

// =========================
// DELETE SINGLE TOKEN
// =========================
export async function deleteRefreshToken(
  email?: string
) {
  const db = await getDB();
  if (!db) return;

  const selected =
    email ||
    localStorage.getItem(
      "active_account"
    );

  if (!selected) return;

  await db.delete(
    "tokens",
    `refresh_${selected}`
  );
}

// =========================
// CLEAR ALL TOKENS
// =========================
export async function clearAllTokens() {
  const db = await getDB();
  if (!db) return;

  await db.clear("tokens");
}

// =========================
// STORE PRIVATE KEY
// =========================
export async function storePrivateKey(base64: string, email: string) {
  const db = await getDB();
  if (!db) return;

  const selected = email || localStorage.getItem("active_account");
  if (!selected) return;

  await db.put("keys", base64, `private_${selected}`);
}

// =========================
// GET PRIVATE KEY
// =========================
export async function getPrivateKey(email: string) {
  const db = await getDB();
  if (!db) return null;

  const selected = email || localStorage.getItem("active_account");

  if (!selected) return null;

  return db.get("keys", `private_${selected}`);
}

// =========================
// CLEAR KEYS
// =========================
export async function clearKeys(email: string) {
  const db = await getDB();
  if (!db) return;

  const selected =
    email || localStorage.getItem("active_account");

  if (!selected) return;

  await db.delete("keys", `private_${selected}`);
}