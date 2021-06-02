import { GuildPluginData } from "knub";
import { PostPluginType } from "../types";

import { downloadFile } from "../../../utils";
import fs from "fs";
import { formatContent } from "./formatContent";
import { TextChannel, Message, MessageOptions, MessageAttachment } from "discord.js";

const fsp = fs.promises;

export async function postMessage(
  pluginData: GuildPluginData<PostPluginType>,
  channel: TextChannel,
  content: MessageOptions,
  attachments: MessageAttachment[] = [],
  enableMentions: boolean = false,
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
  }

  if (enableMentions) {
    content.allowedMentions = {
      parse: ["everyone", "roles", "users"],
    };
  }

  const createdMsg = await channel.send(content, file);
  pluginData.state.savedMessages.setPermanent(createdMsg.id);

  if (downloadedAttachment) {
    downloadedAttachment.deleteFn();
  }

  return createdMsg;
}
