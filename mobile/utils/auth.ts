import { apiRequest, setAccessToken } from "@/utils/api";
import { deleteRefreshToken } from "@/lib/keyStore";
import { removeCachedUser } from "@/lib/userCache";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

export async function logout() {
  // Capture account early (avoid race conditions)
  const selectedAccount =
    await AsyncStorage.getItem("active_account");

  // Always try backend logout
  // Don't block UI cleanup if it fails.
  try {
    await apiRequest("api/users/logout/", {
      method: "POST",
    });
  } catch (err) {
    console.warn(
      "Logout API failed, continuing local cleanup..."
    );
  }

  // Run cleanup in parallel (faster + safer)
  await Promise.allSettled([
    selectedAccount
      ? deleteRefreshToken(selectedAccount)
      : Promise.resolve(),
  ]);

  if (selectedAccount) {
    await removeCachedUser(selectedAccount);
  }

  // Clear runtime auth state
  setAccessToken(null);

  // Clear storage last
  await AsyncStorage.removeItem("active_account");

  // Notify the native app
  DeviceEventEmitter.emit("auth-changed");

  // Keep the same logout-event behavior
  await AsyncStorage.setItem(
    "logout_event",
    Date.now().toString()
  );

  // Navigation should be handled by the auth state/navigation layer.
  DeviceEventEmitter.emit("force-home");
}