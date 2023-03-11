import { MessageCreateOptions } from "discord.js";
import { messageHasContent } from "./messageHasContent";
import { StrictMessageContent } from "../utils.js";

export function messageIsEmpty(content: string | MessageCreateOptions | StrictMessageContent): boolean {
  return !messageHasContent(content);
}
