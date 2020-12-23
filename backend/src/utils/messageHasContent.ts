import { MessageContent } from "eris";

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

export function messageHasContent(content: MessageContent): boolean {
  if (typeof content === "string") {
    return content.trim() !== "";
  }

  if (content.content != null && content.content.trim() !== "") {
    return true;
  }

  if (content.embed && embedHasContent(content.embed)) {
    return true;
  }

  return false;
}
