import {
  GuildTextBasedChannel,
  Message,
  MessageAttachment,
  MessageOptions,
  NewsChannel,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import fs from "fs";
import { GuildPluginData } from "knub";
import { downloadFile } from "../../../utils";
import { PostPluginType } from "../types";
import { formatContent } from "./formatContent";

const fsp = fs.promises;

export async function postMessage(
  pluginData: GuildPluginData<PostPluginType>,
  channel: GuildTextBasedChannel,
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
