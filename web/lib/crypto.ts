// lib/crypto.ts

// =========================
// KEY GENERATION
// =========================
export async function generateKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// =========================
// HELPERS
// =========================
function arrayBufferToBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

// =========================
// PUBLIC KEY IMPORT
// =========================
export async function importPublicKey(publicKeyPem: string) {
  const pem = publicKeyPem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");

  const binaryDer = base64ToArrayBuffer(pem);
  
  return await crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );
}

// =========================
// PRIVATE KEY IMPORT
// =========================
export async function importPrivateKey(base64: string) {
  return await crypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(base64),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );
}

// =========================
// ENCRYPT
// =========================
export async function encryptMessage(publicKeyPem: string, message: string) {
  if (!publicKeyPem) throw new Error("Missing public key");

  const key = await importPublicKey(publicKeyPem);

  const encoded = new TextEncoder().encode(message);

  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    key,
    encoded
  );

  return arrayBufferToBase64(encrypted);
}

// =========================
// DECRYPT
// =========================
export async function decryptMessage(privateKeyBase64: string, encryptedBase64: string) {
  const key = await importPrivateKey(privateKeyBase64);

  const decrypted = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    key,
    base64ToArrayBuffer(encryptedBase64)
  );

  return new TextDecoder().decode(decrypted);
}