import { rootEnv } from "#start/env";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

const KEY = rootEnv.get("KEY");

export function encrypt(str: string): string {
  // Based on https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(str, "utf8", "base64");
  encrypted += cipher.final("base64");
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${encrypted}`;
}

export function decrypt(encrypted: string): string {
  // Based on https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

  const [iv, authTag, encryptedStr] = encrypted.split(".");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encryptedStr, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function encryptJson(obj: any): string {
  const serialized = JSON.stringify(obj);
  return encrypt(serialized);
}

export function decryptJson(encrypted: string): unknown {
  const decrypted = decrypt(encrypted);
  return JSON.parse(decrypted);
}
