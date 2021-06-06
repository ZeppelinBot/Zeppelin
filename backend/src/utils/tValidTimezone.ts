import { either } from "fp-ts/lib/Either";
import * as t from "io-ts";
import { isValidTimezone } from "./isValidTimezone";

export const tValidTimezone = new t.Type<string, string>(
  "tValidTimezone",
  (s): s is string => typeof s === "string",
  (from, to) =>
    either.chain(t.string.validate(from, to), input => {
      return isValidTimezone(input) ? t.success(input) : t.failure(from, to, `Invalid timezone: ${input}`);
    }),
  s => s,
);
