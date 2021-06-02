import { downloadFile } from "../../utils";
import fs from "fs";
import { MessageAttachment, MessageOptions, TextChannel } from "discord.js";
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
    const rehostMessage = await targetChannel.send({ content, split: false });
    return rehostMessage.attachments.values()[0].url;
  } catch {
    return "Failed to rehost attachment";
  }
}
