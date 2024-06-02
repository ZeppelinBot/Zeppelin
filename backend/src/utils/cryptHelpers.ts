import { decrypt, encrypt } from "./crypt.js";

export async function encryptJson(obj: any): Promise<string> {
  const serialized = JSON.stringify(obj);
  return encrypt(serialized);
}

export async function decryptJson(encrypted: string): Promise<unknown> {
  const decrypted = await decrypt(encrypted);
  return JSON.parse(decrypted);
}
