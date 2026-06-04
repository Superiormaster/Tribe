// =========================
// RSA KEY IMPORT (PUBLIC / PRIVATE)
// =========================
export async function importPublicKey(publicKeyPem: string) {
  const pem = publicKeyPem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");

  const binaryDer = base64ToArrayBuffer(pem);

  return crypto.subtle.importKey(
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

export async function importPrivateKey(base64: string) {
  return crypto.subtle.importKey(
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
// RSA WRAP AES KEY
// =========================
export async function wrapAESKey(
  rsaPublicKey: CryptoKey,
  aesKey: CryptoKey
) {
  const wrapped = await crypto.subtle.wrapKey(
    "raw",
    aesKey,
    rsaPublicKey,
    {
      name: "RSA-OAEP",
    }
  );

  return arrayBufferToBase64(wrapped);
}

// =========================
// RSA UNWRAP AES KEY
// =========================
export async function unwrapAESKey(
  rsaPrivateKey: CryptoKey,
  wrappedKeyBase64: string
) {
  const wrapped = base64ToArrayBuffer(wrappedKeyBase64);

  return crypto.subtle.unwrapKey(
    "raw",
    wrapped,
    rsaPrivateKey,
    {
      name: "RSA-OAEP",
    },
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}