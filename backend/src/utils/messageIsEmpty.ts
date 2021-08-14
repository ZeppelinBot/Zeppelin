import { MessageOptions } from "discord.js";
import { messageHasContent } from "./messageHasContent";

export function messageIsEmpty(content: string | MessageOptions): boolean {
  return !messageHasContent(content);
}
