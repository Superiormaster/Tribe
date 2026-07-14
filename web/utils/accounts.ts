export type SavedAccount = {
  email: string;
  type: "google" | "password";
  avatar?: string;
  username?: string;
};

/**
 * Save account after login
 */
export function saveAccount(
  user: any,
  type: "google" | "password"
) {
  const existing: SavedAccount[] =
    JSON.parse(
      localStorage.getItem("accounts") || "[]"
    );

  // remove duplicate
  const updated = existing.filter(
    (acc) => acc.email !== user.email
  );

  updated.push({
    email: user.email,
    type,
    avatar: user.avatar,
    username: user.username,
  });

  localStorage.setItem(
    "accounts",
    JSON.stringify(updated)
  );
}

/**
 * Get all saved accounts
 */
export function getAccounts(): SavedAccount[] {
  try {
    return JSON.parse(
      localStorage.getItem("accounts") || "[]"
    );
  } catch {
    return [];
  }
}

/**
 * Set currently active account
 */
export function setActiveAccount(
  email: string
) {
  localStorage.setItem(
    "active_account",
    email
  );

  updateLastActive();
}

/**
 * Get active account
 */
export function getActiveAccount():
  | string
  | null {
  return localStorage.getItem(
    "active_account"
  );
}

/**
 * Remove one saved account
 */
export function removeAccount(
  email: string
) {
  const accounts = getAccounts();

  const updated = accounts.filter(
    (acc) => acc.email !== email
  );

  localStorage.setItem(
    "accounts",
    JSON.stringify(updated)
  );
}

/**
 * Update activity timestamp
 */
export function updateLastActive() {
  localStorage.setItem(
    "last_active",
    Date.now().toString()
  );
}