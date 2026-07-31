const DB_NAME = "tribe-db";
const DB_VERSION = 2;

const USER_STORE = "users";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(USER_STORE)) {
        db.createObjectStore(USER_STORE, {
          keyPath: "email",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Save cached user.
 * Key = email
 */
export async function saveCachedUser(user: any) {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(USER_STORE, "readwrite");

    tx.objectStore(USER_STORE).put({
      ...user,
      updatedAt: Date.now(),
    });

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Read cached user
 */
export async function getCachedUser(
  email: string
) {
  const db = await openDB();

  return new Promise<any | null>((resolve, reject) => {
    const tx = db.transaction(USER_STORE, "readonly");

    const req =
      tx.objectStore(USER_STORE).get(email);

    req.onsuccess = () => {
      db.close();
      resolve(req.result || null);
    };

    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/**
 * Delete one cached user
 */
export async function removeCachedUser(
  email: string
) {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(USER_STORE, "readwrite");

    tx.objectStore(USER_STORE).delete(email);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Clear every cached user
 */
export async function clearCachedUsers() {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(USER_STORE, "readwrite");

    tx.objectStore(USER_STORE).clear();

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Get all cached users
 */
export async function getAllCachedUsers() {
  const db = await openDB();

  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(USER_STORE, "readonly");

    const req =
      tx.objectStore(USER_STORE).getAll();

    req.onsuccess = () => {
      db.close();
      resolve(req.result || []);
    };

    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}