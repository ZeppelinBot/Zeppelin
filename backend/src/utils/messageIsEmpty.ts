import { MessageCreateOptions } from "discord.js";
import { messageHasContent } from "./messageHasContent";

export function messageIsEmpty(content: string | MessageCreateOptions): boolean {
  return !messageHasContent(content);
}
