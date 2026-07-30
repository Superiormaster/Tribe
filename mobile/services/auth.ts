import { apiRequest, setAccessToken } from "@/utils/api";

import {
  getActiveAccount,
  deleteRefreshToken,
  clearActiveAccount,
  clearKeys,
} from "@/lib/keyStore";

export async function logout() {
  // Capture account first to avoid race conditions
  const selectedAccount =
    await getActiveAccount();

  // Try backend logout
  // Do not block local cleanup if it fails
  try {
    await apiRequest(
      "api/users/logout/",
      {
        method: "POST",
      }
    );
  } catch (err) {
    console.warn(
      "Logout API failed, continuing local cleanup..."
    );
  }

  // Cleanup secure storage
  await Promise.allSettled([
    selectedAccount
      ? deleteRefreshToken(
          selectedAccount
        )
      : Promise.resolve(),

    selectedAccount
      ? clearKeys(
          selectedAccount
        )
      : Promise.resolve(),
  ]);

  // Clear active account
  await clearActiveAccount();

  // Clear memory token
  setAccessToken(null);

  /**
   * AuthContext should listen to this state
   * and redirect user to login screen.
   *
   * Example:
   * setUser(null)
   * navigation.replace("Login")
   */

  return true;
}