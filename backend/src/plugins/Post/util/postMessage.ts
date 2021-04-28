import { GuildPluginData } from "knub";
import { PostPluginType } from "../types";
import { Attachment, Message, MessageContent, TextChannel } from "eris";
import { downloadFile } from "../../../utils";
import fs from "fs";
import { formatContent } from "./formatContent";

const fsp = fs.promises;

export async function postMessage(
  pluginData: GuildPluginData<PostPluginType>,
  channel: TextChannel,
  content: MessageContent,
  attachments: Attachment[] = [],
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
      name: attachments[0].filename,
      file: await fsp.readFile(downloadedAttachment.path),
    };
  }

  if (enableMentions) {
    content.allowedMentions = {
      everyone: true,
      users: true,
      roles: true,
    };
  }

  const createdMsg = await channel.createMessage(content, file);
  pluginData.state.savedMessages.setPermanent(createdMsg.id);

  if (downloadedAttachment) {
    downloadedAttachment.deleteFn();
  }

  return createdMsg;
}
