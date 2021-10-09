import crypto from "crypto";
import { expose } from "threads";

const ALGORITHM = "aes-256-gcm";

function encrypt(str, key) {
  // Based on https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(str, "utf8", "base64");
  encrypted += cipher.final("base64");
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${encrypted}`;
}

function decrypt(encrypted, key) {
  // Based on https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

  const [iv, authTag, encryptedStr] = encrypted.split(".");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encryptedStr, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const toExpose = { encrypt, decrypt };
expose(toExpose);
export type CryptFns = typeof toExpose;
