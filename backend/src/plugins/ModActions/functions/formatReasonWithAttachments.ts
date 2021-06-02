import { MessageAttachment } from "discord.js";

export function formatReasonWithAttachments(reason: string, attachments: MessageAttachment[]) {
  const attachmentUrls = attachments.map(a => a.url);
  return ((reason || "") + " " + attachmentUrls.join(" ")).trim();
}
