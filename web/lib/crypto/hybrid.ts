// lib/crypto/hybrid.ts

import { generateAESKey, aesDecrypt, aesEncrypt } from "./aes";
import { importPublicKey, wrapAESKey, importPrivateKey, unwrapAESKey } from "./rsa";

export async function encryptForUser(pubKey: string, message: string) {
  const aesKey = await generateAESKey();

  const { encryptedMessage, iv } = await aesEncrypt(aesKey, message);

  const rsaKey = await importPublicKey(pubKey);

  const encryptedKey = await wrapAESKey(rsaKey, aesKey);

  return {
    encryptedMessage,
    encryptedKey,
    iv,
  };
}

export async function decryptForUser(
  privateKeyBase64: string,
  payload: {
    encryptedMessage: string;
    encryptedKey: string;
    iv: string;
  }
) {
  const rsaKey = await importPrivateKey(privateKeyBase64);

  const aesKey = await unwrapAESKey(rsaKey, payload.encryptedKey);

  const message = await aesDecrypt(
    aesKey,
    payload.encryptedMessage,
    payload.iv
  );

  return message;
}