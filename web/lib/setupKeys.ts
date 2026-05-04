import { generateKeyPair } from "./crypto";
import { apiRequest } from "@/utils/api";
import { getPrivateKey, storePrivateKey } from "./keyStore";

// =========================
// RUN ON LOGIN
// =========================
export async function setupKeys(userId: number) {
  const existing = await getPrivateKey();

  // already exists → skip
  if (existing) return;

  const keyPair = await generateKeyPair();

  // export keys
  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const toBase64 = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)));

  const publicKeyBase64 = toBase64(publicKey);
  const privateKeyBase64 = toBase64(privateKey);

  // send public key to backend
  await apiRequest("api/users/save-key/", {
    method: "POST",
    data: {
      user_id: userId,
      public_key: publicKeyBase64,
    },
  });

  // store private key locally (IndexedDB)
  await storePrivateKey(privateKeyBase64);
}