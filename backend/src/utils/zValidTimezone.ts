import { ZodString } from "zod";
import { isValidTimezone } from "./isValidTimezone.js";

export function zValidTimezone<Z extends ZodString>(z: Z) {
  return z.refine((val) => isValidTimezone(val), {
    message: "Invalid timezone",
  });
}
