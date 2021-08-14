import crypto from "crypto";
import "../loadEnv";

if (!process.env.KEY) {
  // tslint:disable-next-line:no-console
  console.error("Environment value KEY required for encryption");
  process.exit(1);
}

const KEY = process.env.KEY;
const ALGORITHM = "aes-256-gcm";

export function encrypt(str) {
  // Based on https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(str, "utf8", "base64");
  encrypted += cipher.final("base64");
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${encrypted}`;
}

export function decrypt(encrypted) {
  // Based on https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

  const [iv, authTag, encryptedStr] = encrypted.split(".");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encryptedStr, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
