import { MessageAttachment, MessageOptions, TextChannel } from "discord.js";
import fs from "fs";
import { downloadFile } from "../../utils";
const fsp = fs.promises;

const MAX_ATTACHMENT_REHOST_SIZE = 1024 * 1024 * 8;

export async function rehostAttachment(attachment: MessageAttachment, targetChannel: TextChannel): Promise<string> {
  if (attachment.size > MAX_ATTACHMENT_REHOST_SIZE) {
    return "Attachment too big to rehost";
  }

  let downloaded;
  try {
    downloaded = await downloadFile(attachment.url, 3);
  } catch {
    return "Failed to download attachment after 3 tries";
  }

  try {
    const content: MessageOptions = {
      content: `Rehost of attachment ${attachment.id}`,
      files: [{ name: attachment.name ? attachment.name : undefined, attachment: await fsp.readFile(downloaded.path) }],
    };
    const rehostMessage = await targetChannel.send(content);
    return rehostMessage.attachments.values()[0].url;
  } catch {
    return "Failed to rehost attachment";
  }
}
