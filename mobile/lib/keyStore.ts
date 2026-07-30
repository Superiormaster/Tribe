import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// =========================
// ACTIVE ACCOUNT
// =========================

const ACTIVE_ACCOUNT_KEY = "active_account";

export async function setActiveAccount(email: string) {
  await AsyncStorage.setItem(
    ACTIVE_ACCOUNT_KEY,
    email
  );
}

export async function getActiveAccount() {
  return AsyncStorage.getItem(
    ACTIVE_ACCOUNT_KEY
  );
}

export async function clearActiveAccount() {
  await AsyncStorage.removeItem(
    ACTIVE_ACCOUNT_KEY
  );
}

// =========================
// STORE REFRESH TOKEN
// =========================

export async function storeRefreshToken(
  email: string,
  token: string
) {
  await SecureStore.setItemAsync(
    `refresh_${email}`,
    token
  );
}

// =========================
// GET REFRESH TOKEN
// =========================

export async function getRefreshToken(
  email?: string
) {
  const selected =
    email ||
    (await getActiveAccount());

  if (!selected) return null;

  return SecureStore.getItemAsync(
    `refresh_${selected}`
  );
}

// =========================
// DELETE REFRESH TOKEN
// =========================

export async function deleteRefreshToken(
  email?: string
) {
  const selected =
    email ||
    (await getActiveAccount());

  if (!selected) return;

  await SecureStore.deleteItemAsync(
    `refresh_${selected}`
  );
}

// =========================
// CLEAR ALL TOKENS
// =========================

export async function clearAllTokens() {
  const selected =
    await getActiveAccount();

  if (!selected) return;

  await SecureStore.deleteItemAsync(
    `refresh_${selected}`
  );
}

// =========================
// STORE PRIVATE KEY
// =========================

export async function storePrivateKey(
  base64: string,
  email: string
) {
  const selected =
    email ||
    (await getActiveAccount());

  if (!selected) return;

  await SecureStore.setItemAsync(
    `private_${selected}`,
    base64
  );
}

// =========================
// GET PRIVATE KEY
// =========================

export async function getPrivateKey(
  email?: string
) {
  const selected =
    email ||
    (await getActiveAccount());

  if (!selected) return null;

  return SecureStore.getItemAsync(
    `private_${selected}`
  );
}

// =========================
// CLEAR PRIVATE KEY
// =========================

export async function clearKeys(
  email?: string
) {
  const selected =
    email ||
    (await getActiveAccount());

  if (!selected) return;

  await SecureStore.deleteItemAsync(
    `private_${selected}`
  );
}