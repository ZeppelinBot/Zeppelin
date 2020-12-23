import { MessageContent } from "eris";
import { messageHasContent } from "./messageHasContent";

export function messageIsEmpty(content: MessageContent): boolean {
  return !messageHasContent(content);
}
