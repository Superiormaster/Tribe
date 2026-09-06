import { getDB } from '@/lib/chat/db';

const USER_STORE = 'users';

let schemaPromise: Promise<void> | null = null;

async function ensureSchema() {
if (!schemaPromise) {
schemaPromise = (async () => {
const db = await getDB();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${USER_STORE} (
      email TEXT PRIMARY KEY NOT NULL,
      data_json TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
})();

}

return schemaPromise;
}

function serializeUser(user: any) {
return JSON.stringify(user ?? {});
}

function deserializeUser(data: string | null | undefined) {
if (!data) return null;

try {
return JSON.parse(data);
} catch {
return null;
}
}

export async function saveCachedUser(user: any) {
await ensureSchema();

const db = await getDB();

if (!user?.email) {
throw new Error(
'Cannot cache user without an email'
);
}

const updatedAt = Date.now();

await db.runAsync(
"INSERT OR REPLACE INTO ${USER_STORE} ( email, data_json, updatedAt ) VALUES (?, ?, ?)",
[
user.email,
serializeUser({
...user,
updatedAt,
}),
updatedAt,
]
);
}

/**

* Get one cached user
  */
  export async function getCachedUser(
  email: string
  ) {
  await ensureSchema();

const db = await getDB();

const row = await db.getFirstAsync<{
data_json: string;
}>(
"SELECT data_json FROM ${USER_STORE} WHERE email = ? LIMIT 1",
[email]
);

if (!row) {
return null;
}

return deserializeUser(row.data_json);
}

/**

* Delete one cached user
  */
  export async function removeCachedUser(
  email: string
  ) {
  await ensureSchema();

const db = await getDB();

await db.runAsync(
"DELETE FROM ${USER_STORE} WHERE email = ?",
[email]
);
}

/**

* Clear every cached user
  */
  export async function clearCachedUsers() {
  await ensureSchema();

const db = await getDB();

await db.runAsync(
"DELETE FROM ${USER_STORE}"
);
}

/**

* Get all cached users
  */
  export async function getAllCachedUsers() {
  await ensureSchema();

const db = await getDB();

const rows = await db.getAllAsync<{
data_json: string;
}>(
"SELECT data_json FROM ${USER_STORE} ORDER BY updatedAt DESC"
);

return rows
.map((row) =>
deserializeUser(row.data_json)
)
.filter(Boolean);
}