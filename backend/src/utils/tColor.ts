import * as t from "io-ts";
import { either } from "fp-ts/lib/Either";
import { convertDelayStringToMS } from "../utils";
import { parseColor } from "./parseColor";
import { rgbToInt } from "./rgbToInt";
import { intToRgb } from "./intToRgb";

export const tColor = new t.Type<number, string>(
  "tColor",
  (s): s is number => typeof s === "number",
  (from, to) =>
    either.chain(t.string.validate(from, to), (input) => {
      const parsedColor = parseColor(input);
      return parsedColor == null ? t.failure(from, to, "Invalid color") : t.success(rgbToInt(parsedColor));
    }),
  (s) => intToRgb(s).join(","),
);
