import AsyncStorage from "@react-native-async-storage/async-storage";

export type SavedAccount = {
  email: string;
  type: "google" | "password";
  avatar?: string;
  username?: string;
};

const ACCOUNTS_KEY = "accounts";
const ACTIVE_ACCOUNT_KEY = "active_account";
const LAST_ACTIVE_KEY = "last_active";

/**
 * Save account after login
 */
export async function saveAccount(
  user: any,
  type: "google" | "password"
) {
  const accounts = await getAccounts();

  // Remove duplicate
  const updated = accounts.filter(
    (acc) => acc.email !== user.email
  );

  updated.push({
    email: user.email,
    type,
    avatar: user.avatar,
    username: user.username,
  });

  await AsyncStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify(updated)
  );
}

/**
 * Get all saved accounts
 */
export async function getAccounts(): Promise<SavedAccount[]> {
  try {
    const data = await AsyncStorage.getItem(
      ACCOUNTS_KEY
    );

    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Set currently active account
 */
export async function setActiveAccount(
  email: string
) {
  await AsyncStorage.setItem(
    ACTIVE_ACCOUNT_KEY,
    email
  );

  await updateLastActive();
}

/**
 * Get active account
 */
export async function getActiveAccount(): Promise<string | null> {
  return AsyncStorage.getItem(
    ACTIVE_ACCOUNT_KEY
  );
}

/**
 * Clear active account
 */
export async function clearActiveAccount() {
  await AsyncStorage.removeItem(
    ACTIVE_ACCOUNT_KEY
  );
}

/**
 * Remove one saved account
 */
export async function removeAccount(
  email: string
) {
  const accounts = await getAccounts();

  const updated = accounts.filter(
    (acc) => acc.email !== email
  );

  await AsyncStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify(updated)
  );

  const active = await getActiveAccount();

  if (active === email) {
    await clearActiveAccount();
  }
}

/**
 * Update activity timestamp
 */
export async function updateLastActive() {
  await AsyncStorage.setItem(
    LAST_ACTIVE_KEY,
    Date.now().toString()
  );
}

/**
 * Get last activity timestamp
 */
export async function getLastActive(): Promise<number | null> {
  const value = await AsyncStorage.getItem(
    LAST_ACTIVE_KEY
  );

  return value ? Number(value) : null;
}