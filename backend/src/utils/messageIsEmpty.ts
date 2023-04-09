import { MessageCreateOptions } from "discord.js";
import { StrictMessageContent } from "../utils.js";
import { messageHasContent } from "./messageHasContent";

export function messageIsEmpty(content: string | MessageCreateOptions | StrictMessageContent): boolean {
  return !messageHasContent(content);
}
