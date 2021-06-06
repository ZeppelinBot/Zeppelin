import { either } from "fp-ts/lib/Either";
import * as t from "io-ts";
import { intToRgb } from "./intToRgb";
import { parseColor } from "./parseColor";
import { rgbToInt } from "./rgbToInt";

export const tColor = new t.Type<number, string>(
  "tColor",
  (s): s is number => typeof s === "number",
  (from, to) =>
    either.chain(t.string.validate(from, to), input => {
      const parsedColor = parseColor(input);
      return parsedColor == null ? t.failure(from, to, "Invalid color") : t.success(rgbToInt(parsedColor));
    }),
  s => intToRgb(s).join(","),
);
