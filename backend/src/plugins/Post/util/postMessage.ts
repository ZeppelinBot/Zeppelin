import { Attachment, GuildTextBasedChannel, Message, MessageCreateOptions } from "discord.js";
import fs from "fs";
import { GuildPluginData } from "vety";
import { downloadFile } from "../../../utils.js";
import { PostPluginType } from "../types.js";
import { formatContent } from "./formatContent.js";

const fsp = fs.promises;

export async function postMessage(
  pluginData: GuildPluginData<PostPluginType>,
  channel: GuildTextBasedChannel,
  content: MessageCreateOptions,
  attachments: Attachment[] = [],
  enableMentions = false,
): Promise<Message> {
  if (typeof content === "string") {
    content = { content };
  }

  if (content && content.content) {
    content.content = formatContent(content.content);
  }

  let downloadedAttachment;
  let file;
  if (attachments.length) {
    downloadedAttachment = await downloadFile(attachments[0].url);
    file = {
      name: attachments[0].name,
      file: await fsp.readFile(downloadedAttachment.path),
    };
    content.files = [file.file];
  }

  if (enableMentions) {
    content.allowedMentions = {
      parse: ["everyone", "roles", "users"],
    };
  }

  const createdMsg = await channel.send(content);
  pluginData.state.savedMessages.setPermanent(createdMsg.id);

  if (downloadedAttachment) {
    downloadedAttachment.deleteFn();
  }

  return createdMsg;
}
