import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDB } from "@/lib/chat/db";

const STORE_NAME = "notification_state";

let schemaPromise: Promise<void> | null = null;

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = await getDB();

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${STORE_NAME} (
          account_key TEXT PRIMARY KEY,
          value INTEGER NOT NULL
        );
      `);
    })();
  }

  return schemaPromise;
}

async function getAccountKey() {
  const account = await AsyncStorage.getItem("active_account");

  if (!account) {
    return null;
  }

  return `notification_page_opened_${account}`;
}

export async function getNotificationPageOpened() {
  const key = await getAccountKey();

  if (!key) return null;

  await ensureSchema();

  const db = await getDB();

  const row = await db.getFirstAsync<{ value: number }>(
    `SELECT value FROM ${STORE_NAME} WHERE account_key = ?`,
    [key]
  );

  if (!row) return null;

  return row.value === 1;
}

export async function setNotificationPageOpened(
  value: boolean
) {
  const key = await getAccountKey();

  if (!key) return;

  await ensureSchema();

  const db = await getDB();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO ${STORE_NAME}
        (account_key, value)
      VALUES
        (?, ?)
    `,
    [key, value ? 1 : 0]
  );
}

export async function clearNotificationPageOpened() {
  const key = await getAccountKey();

  if (!key) return;

  await ensureSchema();

  const db = await getDB();

  await db.runAsync(
    `DELETE FROM ${STORE_NAME} WHERE account_key = ?`,
    [key]
  );
}