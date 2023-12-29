import { Attachment } from "discord.js";

export function formatReasonWithAttachments(reason: string, attachments: Attachment[]) {
  const attachmentUrls = attachments.map((a) => a.url);
  return ((reason || "") + " " + attachmentUrls.join(" ")).trim();
}
