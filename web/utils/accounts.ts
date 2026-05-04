type SavedAccount = {
  email: string;
  type: "google" | "password";
  avatar?: string;
  username?: string;
};

/**
 * Save account (used after login)
 */
export function saveAccount(user: any, type: "google" | "password") {
  const existing: SavedAccount[] = JSON.parse(localStorage.getItem("accounts") || "[]");

  const updated = existing.filter(acc => acc.email !== user.email);

  updated.push({
    email: user.email,
    type,
    avatar: user.avatar,
    username: user.username,
  });

  localStorage.setItem("accounts", JSON.stringify(updated));
}

/**
 * Get all accounts (used in switch UI)
 */
export function getAccounts(): SavedAccount[] {
  try {
    return JSON.parse(localStorage.getItem("accounts") || "[]");
  } catch {
    return [];
  }
}

export function setActiveAccount(email: string) {
  localStorage.setItem("active_account", email);
}

export function getActiveAccount(): string | null {
  return localStorage.getItem("active_account");
}

function updateLastActive() {
  localStorage.setItem("last_active", Date.now().toString());
}