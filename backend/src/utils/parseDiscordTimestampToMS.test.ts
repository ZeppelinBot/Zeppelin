import test from "ava";
import { parseDiscordTimestampToMS } from "./parseDiscordTimestampToMS.js";

test("parseDiscordTimestampToMS: accepts timestamp markup", (t) => {
  t.is(parseDiscordTimestampToMS("<t:1767200400>"), 1_767_200_400_000);
  t.is(parseDiscordTimestampToMS("<t:1767200400:F>"), 1_767_200_400_000);
  t.is(parseDiscordTimestampToMS("<t:1767200400:s>"), 1_767_200_400_000);
  t.is(parseDiscordTimestampToMS("<t:1767200400:S>"), 1_767_200_400_000);
});

test("parseDiscordTimestampToMS: rejects invalid timestamp markup", (t) => {
  t.is(parseDiscordTimestampToMS("1767200400"), null);
  t.is(parseDiscordTimestampToMS("<t:1767200400:invalid>"), null);
  t.is(parseDiscordTimestampToMS("<t:-1767200400>"), null);
});
