import test from "ava";
import { decrypt, encrypt } from "./crypt";

test("encrypt() followed by decrypt()", t => {
  const original = "banana 123 👀 💕"; // Includes emojis to verify utf8 stuff works
  const encrypted = encrypt(original);
  const decrypted = decrypt(encrypted);
  t.is(decrypted, original);
});
