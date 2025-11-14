import { ChatInputCommandInteraction, Message, SendableChannels } from "discord.js";
import { GuildPluginData } from "vety";
import { ModActionsPluginType } from "../types.js";

export function shouldReactToAttachmentLink(pluginData: GuildPluginData<ModActionsPluginType>) {
  const config = pluginData.config.get();
  return !config.attachment_link_reaction || config.attachment_link_reaction !== "none";
}

export function attachmentLinkShouldRestrict(pluginData: GuildPluginData<ModActionsPluginType>) {
  return pluginData.config.get().attachment_link_reaction === "restrict";
}

export function detectAttachmentLink(reason: string | null | undefined) {
  return reason && /https:\/\/(cdn|media)\.discordapp\.(com|net)\/(ephemeral-)?attachments/gu.test(reason);
}

function sendAttachmentLinkDetectionErrorMessage(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: SendableChannels | Message | ChatInputCommandInteraction,
  restricted = false,
) {
  const emoji = pluginData.state.common.getErrorEmoji();

  pluginData.state.common.sendErrorMessage(
    context,
    "You manually added a Discord attachment link to the reason. This link will only work for a limited time.\n" +
      "You should instead **re-upload** the attachment with the command, in the same message.\n\n" +
      (restricted ? `${emoji} **Command canceled.** ${emoji}` : "").trim(),
  );
}

export async function handleAttachmentLinkDetectionAndGetRestriction(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: SendableChannels | Message | ChatInputCommandInteraction,
  reason: string | null | undefined,
) {
  if (!shouldReactToAttachmentLink(pluginData) || !detectAttachmentLink(reason)) {
    return false;
  }

  const restricted = attachmentLinkShouldRestrict(pluginData);

  sendAttachmentLinkDetectionErrorMessage(pluginData, context, restricted);

  return restricted;
}
