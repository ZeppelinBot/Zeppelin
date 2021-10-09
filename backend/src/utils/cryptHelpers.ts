import { decrypt, encrypt } from "./crypt";

export async function encryptJson(obj: any): Promise<string> {
  const serialized = JSON.stringify(obj);
  return encrypt(serialized);
}

export async function decryptJson<T extends unknown>(encrypted: string): Promise<T> {
  const decrypted = await decrypt(encrypted);
  return JSON.parse(decrypted);
}
