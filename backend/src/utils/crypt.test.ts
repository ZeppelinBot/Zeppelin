import test from "ava";
import { decrypt, encrypt } from "./crypt";

test("encrypt() followed by decrypt()", async (t) => {
  const original = "banana 123 👀 💕"; // Includes emojis to verify utf8 stuff works
  const encrypted = await encrypt(original);
  const decrypted = await decrypt(encrypted);
  t.is(decrypted, original);
});
