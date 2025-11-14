import { z } from "zod";
import { parseColor } from "./parseColor.js";
import { rgbToInt } from "./rgbToInt.js";

export const zColor = z.string().transform((val, ctx) => {
  const parsedColor = parseColor(val);
  if (parsedColor == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid color",
    });
    return z.NEVER;
  }
  return rgbToInt(parsedColor);
});
