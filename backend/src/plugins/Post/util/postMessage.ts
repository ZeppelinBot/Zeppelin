import { PluginData } from "knub";
import { PostPluginType } from "../types";
import { TextChannel, MessageContent, Attachment, Message, Role } from "eris";
import { downloadFile, getRoleMentions } from "src/utils";
import fs from "fs";
import { formatContent } from "./formatContent";

const fsp = fs.promises;

export async function postMessage(
  pluginData: PluginData<PostPluginType>,
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

  const rolesMadeMentionable: Role[] = [];
  if (enableMentions && content.content) {
    const mentionedRoleIds = getRoleMentions(content.content);
    if (mentionedRoleIds != null) {
      for (const roleId of mentionedRoleIds) {
        const role = pluginData.guild.roles.get(roleId);
        if (role && !role.mentionable) {
          await role.edit({
            mentionable: true,
          });
          rolesMadeMentionable.push(role);
        }
      }
    }

    content.allowedMentions.everyone = false;
  }

  const createdMsg = await channel.createMessage(content, file);
  pluginData.state.savedMessages.setPermanent(createdMsg.id);

  for (const role of rolesMadeMentionable) {
    role.edit({
      mentionable: false,
    });
  }

  if (downloadedAttachment) {
    downloadedAttachment.deleteFn();
  }

  return createdMsg;
}
