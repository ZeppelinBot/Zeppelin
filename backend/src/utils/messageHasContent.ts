import { MessageCreateOptions } from "discord.js";
import { StrictMessageContent } from "../utils.js";

function embedHasContent(embed: any) {
  for (const [key, value] of Object.entries(embed)) {
    if (typeof value === "string" && value.trim() !== "") {
      return true;
    }

    if (typeof value === "object" && value != null && embedHasContent(value)) {
      return true;
    }

    if (value != null) {
      return true;
    }
  }

  return false;
}

export function messageHasContent(content: string | MessageCreateOptions | StrictMessageContent): boolean {
  if (typeof content === "string") {
    return content.trim() !== "";
  }

  if (content.content != null && content.content.trim() !== "") {
    return true;
  }

  if (content.embeds) {
    for (const embed of content.embeds) {
      if (embed && embedHasContent(embed)) {
        return true;
      }
    }
  }

  return false;
}
