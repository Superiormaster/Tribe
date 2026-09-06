import * as SQLite from "expo-sqlite";

const DB_VERSION = 19;
const DB_NAME = "tribe-chat-db";

export const MESSAGE_STORE = "messages";
export const COMMUNITY_STORE = "communities";
export const CHAT_DRAFT_STORE = "drafts";
export const COMMUNITY_DRAFT_STORE = "community_drafts";
export const CHAT_STORE = "chats";
export const POST_DRAFT_STORE = "post_drafts";
export const OUTBOX_STORE = "message_outbox";
export const CHAT_SCROLL_STORE = "chat_scroll";
export const MESSAGE_SEQUENCE_STORE = "message_sequence";
export const CHAT_READ = "chat_read";

export type ChatType =
| "private"
| "community";

export type OutboxStatus =
| "pending"
| "processing"
| "failed";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initializeDatabase(
db: SQLite.SQLiteDatabase
) {
await db.execAsync(`
PRAGMA journal_mode = WAL;

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS messages (
  account_message_key TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  id INTEGER,
  server_id INTEGER,
  ownerId INTEGER,
  client_sequence INTEGER,
  sender INTEGER,
  chat INTEGER,
  community INTEGER,
  communityId INTEGER,

  chat_type TEXT NOT NULL,

  encrypted_text TEXT,
  caption TEXT,
  media_type TEXT,
  media_source TEXT,
  media_url TEXT,
  thumbnail TEXT,
  duration TEXT,
  waveform TEXT,
  status TEXT,
  media_status TEXT,
  upload_progress REAL,
  created_at TEXT,
  updated_at TEXT,
  files TEXT,
  reactions TEXT,
  hidden_for TEXT,
  is_deleted INTEGER DEFAULT 0,
  delivered_to TEXT,
  seen_by TEXT,
  read_by TEXT,
  reply_to TEXT,
  mentions TEXT
);

CREATE INDEX IF NOT EXISTS
  idx_messages_chat_owner
  ON messages(chat, ownerId, chat_type);

CREATE INDEX IF NOT EXISTS
  idx_messages_chat_owner_id
  ON messages(chat, ownerId, chat_type, id);

CREATE INDEX IF NOT EXISTS
  idx_messages_community_owner_id
  ON messages(
    communityId,
    ownerId,
    chat_type,
    id
  );

CREATE INDEX IF NOT EXISTS
  idx_messages_owner_status
  ON messages(ownerId, status);

CREATE INDEX IF NOT EXISTS
  idx_messages_owner_client
  ON messages(ownerId, client_id);

CREATE INDEX IF NOT EXISTS
  idx_messages_owner_type_status
  ON messages(ownerId, chat_type, status);

CREATE INDEX IF NOT EXISTS
  idx_messages_created_at
  ON messages(created_at);


CREATE TABLE IF NOT EXISTS chats (
  chatId INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT
);


CREATE TABLE IF NOT EXISTS communities (
  communityId INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  cover_image_url TEXT
);


CREATE TABLE IF NOT EXISTS drafts (
  chatId INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS community_drafts (
  communityId INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS post_drafts (
  draftId TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT,
  imageFiles TEXT,
  imageUrls TEXT,
  video TEXT,
  selectedCommunity INTEGER,
  updated_at INTEGER
);


CREATE TABLE IF NOT EXISTS chat_scroll (
  id TEXT PRIMARY KEY,
  chatId INTEGER,
  communityId INTEGER,
  userId INTEGER NOT NULL,
  messageId TEXT,
  clientId TEXT,
  offset REAL NOT NULL,
  updatedAt INTEGER NOT NULL
);


CREATE TABLE IF NOT EXISTS chat_read (
  id TEXT PRIMARY KEY,
  chatId INTEGER,
  communityId INTEGER,
  userId INTEGER NOT NULL,
  messageId TEXT,
  clientId TEXT,
  updatedAt INTEGER NOT NULL
);


CREATE TABLE IF NOT EXISTS message_sequence (
  ownerId INTEGER PRIMARY KEY,
  nextSequence INTEGER NOT NULL
);


CREATE TABLE IF NOT EXISTS message_outbox (
  client_id TEXT PRIMARY KEY,
  ownerId INTEGER NOT NULL,
  chat_id INTEGER NOT NULL,
  chat_type TEXT NOT NULL,
  processing_at INTEGER,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  next_attempt_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_error TEXT
);


CREATE INDEX IF NOT EXISTS
  idx_outbox_owner_status
  ON message_outbox(ownerId, status);

CREATE INDEX IF NOT EXISTS
  idx_outbox_retry
  ON message_outbox(status, next_attempt_at);


PRAGMA user_version = ${DB_VERSION};

`);

console.log(
"[SQLite] Database initialized at version ${DB_VERSION}"
);
}

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
if (!dbPromise) {
dbPromise = (async () => {
try {
const db =
await SQLite.openDatabaseAsync(DB_NAME);

    await initializeDatabase(db);

    return db;
  } catch (error) {
    console.error(
      "[SQLite] Database initialization failed",
      error
    );

    dbPromise = null;

    throw error;
  }
})();

}

return dbPromise;
}

export async function resetDatabase() {
try {
if (dbPromise) {
const db = await dbPromise;

  await db.closeAsync();

  dbPromise = null;
}

await SQLite.deleteDatabaseAsync(DB_NAME);

console.log(
  "[SQLite] Database reset"
);

} catch (error) {
console.error(
"[SQLite] Reset failed",
error
);
}
}