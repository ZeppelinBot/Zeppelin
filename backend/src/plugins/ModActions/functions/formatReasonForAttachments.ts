import { Attachment, ChatInputCommandInteraction, Message } from "discord.js";
import { GuildPluginData } from "vety";
import { isContextMessage } from "../../../pluginUtils.js";
import { ModActionsPluginType } from "../types.js";

export async function formatReasonWithMessageLinkForAttachments(
  pluginData: GuildPluginData<ModActionsPluginType>,
  reason: string,
  context: Message | ChatInputCommandInteraction,
  attachments: Attachment[],
) {
  if (isContextMessage(context)) {
    const allAttachments = [...new Set([...context.attachments.values(), ...attachments])];

    return allAttachments.length > 0 ? ((reason || "") + " " + context.url).trim() : reason;
  }

  if (attachments.length < 1) {
    return reason;
  }

  const attachmentsMessage = await pluginData.state.common.storeAttachmentsAsMessage(attachments, context.channel);

  return ((reason || "") + " " + attachmentsMessage.url).trim();
}

export function formatReasonWithAttachments(reason: string, attachments: Attachment[]) {
  const attachmentUrls = attachments.map((a) => a.url);
  return ((reason || "") + " " + attachmentUrls.join(" ")).trim();
}
