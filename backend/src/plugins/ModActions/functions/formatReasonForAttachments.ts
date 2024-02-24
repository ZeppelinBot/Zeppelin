import { Attachment, ChatInputCommandInteraction, Message, TextBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { isContextMessage } from "../../../pluginUtils";
import { ModActionsPluginType } from "../types";

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

  const attachmentChannelId = pluginData.config.get().attachment_storing_channel;
  const channel = attachmentChannelId
    ? (pluginData.guild.channels.cache.get(attachmentChannelId) as TextBasedChannel) ?? context.channel
    : context.channel;

  const message = await channel!.send({
    content: `Storing ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`,
    files: attachments.map((a) => a.url),
  });

  return ((reason || "") + " " + message.url).trim();
}

export function formatReasonWithAttachments(reason: string, attachments: Attachment[]) {
  const attachmentUrls = attachments.map((a) => a.url);
  return ((reason || "") + " " + attachmentUrls.join(" ")).trim();
}
