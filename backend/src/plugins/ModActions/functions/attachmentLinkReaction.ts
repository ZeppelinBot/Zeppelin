import { ChatInputCommandInteraction, Message, TextBasedChannel } from "discord.js";
import { AnyPluginData, GuildPluginData } from "knub";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { ModActionsPluginType } from "../types";

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

export function sendAttachmentLinkDetectionErrorMessage(
  pluginData: AnyPluginData<any>,
  context: TextBasedChannel | Message | ChatInputCommandInteraction,
  restricted = false,
) {
  const emoji = pluginData.getPlugin(CommonPlugin).getErrorEmoji();

  pluginData
    .getPlugin(CommonPlugin)
    .sendErrorMessage(
      context,
      "You manually added a Discord attachment link to the reason. This link will only work for a limited time.\n" +
        "You should instead **re-upload** the attachment with the command, in the same message.\n\n" +
        (restricted ? `${emoji} **Command canceled.** ${emoji}` : "").trim(),
    );
}

export async function handleAttachmentLinkDetectionAndGetRestriction(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | Message | ChatInputCommandInteraction,
  reason: string | null | undefined,
) {
  if (!shouldReactToAttachmentLink(pluginData) || !detectAttachmentLink(reason)) {
    return false;
  }

  const restricted = attachmentLinkShouldRestrict(pluginData);

  sendAttachmentLinkDetectionErrorMessage(pluginData, context, restricted);

  return restricted;
}
