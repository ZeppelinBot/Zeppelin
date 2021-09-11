import test from "ava";
import { normalizeText } from "./normalizeText";

test("Replaces special characters", (t) => {
  const from = "𝗧:regional_indicator_e:ᔕ7 𝗧:regional_indicator_e:ᔕ7 𝗧:regional_indicator_e:ᔕ7";
  const to = "test test test";

  t.deepEqual(normalizeText(from), to);
});

test("Does not change lowercase ASCII text", (t) => {
  const text = "lorem ipsum dolor sit amet consectetur adipiscing elit";
  t.deepEqual(normalizeText(text), text);
});

test("Replaces whitespace", (t) => {
  const from = "foo    bar";
  const to = "foo bar";
  t.deepEqual(normalizeText(from), to);
});

test("Result is always lowercase", (t) => {
  const from = "TEST";
  const to = "test";
  t.deepEqual(normalizeText(from), to);
});
