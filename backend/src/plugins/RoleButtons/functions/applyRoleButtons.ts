import { GuildPluginData } from "knub";
import { RoleButtonsPluginType, TRoleButtonsConfigItem } from "../types";
import { isSnowflake, snowflakeRegex } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { Message, MessageButton, MessageEditOptions, MessageOptions, Snowflake } from "discord.js";
import { RoleButtonsItem } from "../../../data/entities/RoleButtonsItem";
import { buildCustomId } from "../../../utils/buildCustomId";
import { createButtonComponents } from "./createButtonComponents";

const channelMessageRegex = new RegExp(`^(${snowflakeRegex.source})-(${snowflakeRegex.source})$`);

export async function applyRoleButtons(
  pluginData: GuildPluginData<RoleButtonsPluginType>,
  configItem: TRoleButtonsConfigItem,
  existingSavedButtons: RoleButtonsItem | null,
): Promise<{ channel_id: string; message_id: string } | null> {
  let message: Message;

  // Remove existing role buttons, if any
  if (existingSavedButtons?.channel_id) {
    const existingChannel = await pluginData.guild.channels.fetch(configItem.message.channel_id).catch(() => null);
    const existingMessage = await (existingChannel?.isText() &&
      existingChannel.messages.fetch(existingSavedButtons.message_id).catch(() => null));
    if (existingMessage && existingMessage.components.length) {
      await existingMessage.edit({
        components: [],
      });
    }
  }

  // Find or create message for role buttons
  if ("message_id" in configItem.message) {
    // channel id + message id: apply role buttons to existing message
    const channel = await pluginData.guild.channels.fetch(configItem.message.channel_id).catch(() => null);
    const messageCandidate = await (channel?.isText() &&
      channel.messages.fetch(configItem.message.message_id).catch(() => null));
    if (!messageCandidate) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Message not found for role_buttons/${configItem.name}`,
      });
      return null;
    }
    message = messageCandidate;
  } else {
    // channel id + message content: post new message to apply role buttons to
    const contentIsValid =
      typeof configItem.message.content === "string"
        ? configItem.message.content.trim() !== ""
        : Boolean(configItem.message.content.content?.trim()) || configItem.message.content.embeds?.length;
    if (!contentIsValid) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Invalid message content for role_buttons/${configItem.name}`,
      });
      return null;
    }

    const channel = await pluginData.guild.channels.fetch(configItem.message.channel_id).catch(() => null);
    if (!channel || !channel.isText()) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Text channel not found for role_buttons/${configItem.name}`,
      });
      return null;
    }

    let candidateMessage: Message | null = null;

    if (existingSavedButtons?.channel_id === configItem.message.channel_id && existingSavedButtons.message_id) {
      try {
        candidateMessage = await channel.messages.fetch(existingSavedButtons.message_id);
        // Make sure message contents are up-to-date
        const editContent =
          typeof configItem.message.content === "string"
            ? { content: configItem.message.content }
            : { ...configItem.message.content };
        if (!editContent.content) {
          // Editing with empty content doesn't go through at all for whatever reason, even if there's differences in e.g. the embeds,
          // so send a space as the content instead. This still functions as if there's no content at all.
          editContent.content = " ";
        }
        await candidateMessage.edit(editContent as MessageEditOptions);
      } catch (err) {
        // Message was deleted or is inaccessible. Proceed with reposting it.
      }
    }

    if (!candidateMessage) {
      try {
        candidateMessage = await channel.send(configItem.message.content as string | MessageOptions);
      } catch (err) {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Error while posting message for role_buttons/${configItem.name}: ${String(err)}`,
        });
        return null;
      }
    }

    message = candidateMessage;
  }

  if (message.author.id !== pluginData.client.user?.id) {
    pluginData.getPlugin(LogsPlugin).logBotAlert({
      body: `Error applying role buttons for role_buttons/${configItem.name}: target message must be posted by Zeppelin`,
    });
    return null;
  }

  // Apply role buttons
  const components = createButtonComponents(configItem);
  await message.edit({ components }).catch((err) => {
    pluginData.getPlugin(LogsPlugin).logBotAlert({
      body: `Error applying role buttons for role_buttons/${configItem.name}: ${String(err)}`,
    });
    return null;
  });

  return {
    channel_id: message.channelId,
    message_id: message.id,
  };
}
