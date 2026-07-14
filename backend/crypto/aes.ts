// =========================
// AES KEY GENERATION
// =========================
export async function generateAESKey() {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// =========================
// AES ENCRYPT MESSAGE
// =========================
export async function aesEncrypt(
  key: CryptoKey,
  message: string
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encoded = new TextEncoder().encode(message);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoded
  );

  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
}

// =========================
// AES DECRYPT MESSAGE
// =========================
export async function aesDecrypt(
  key: CryptoKey,
  encryptedBase64: string,
  ivBase64: string
) {
  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}