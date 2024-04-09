import { TemplateParseError } from "../../templateFormatter.js";
import { ActionError } from "./ActionError.js";

export function catchTemplateError(fn: () => Promise<string>, errorText: string): Promise<string> {
  try {
    return fn();
  } catch (err) {
    if (err instanceof TemplateParseError) {
      throw new ActionError(`${errorText}: ${err.message}`);
    }
    throw err;
  }
}
