/**
 * @file Utility functions that are plugin-instance-specific (i.e. use PluginData)
 */

import {
  GuildMember,
  Message,
  MessageCreateOptions,
  MessageMentionOptions,
  ModalSubmitInteraction,
  PermissionsBitField,
  TextBasedChannel,
} from "discord.js";
import { AnyPluginData, CommandContext, ExtendedMatchParams, GuildPluginData, helpers } from "knub";
import { logger } from "./logger";
import { isStaff } from "./staff";
import { TZeppelinKnub } from "./types";
import { errorMessage, successMessage } from "./utils";
import { Tail } from "./utils/typeUtils";

const { getMemberLevel } = helpers;

export function canActOn(
  pluginData: GuildPluginData<any>,
  member1: GuildMember,
  member2: GuildMember,
  allowSameLevel = false,
  allowAdmins = false,
) {
  if (member2.id === pluginData.client.user!.id) {
    return false;
  }
  const isOwnerOrAdmin =
    member2.id === member2.guild.ownerId || member2.permissions.has(PermissionsBitField.Flags.Administrator);
  if (isOwnerOrAdmin && !allowAdmins) {
    return false;
  }

  const ourLevel = getMemberLevel(pluginData, member1);
  const memberLevel = getMemberLevel(pluginData, member2);
  return allowSameLevel ? ourLevel >= memberLevel : ourLevel > memberLevel;
}

export async function hasPermission(
  pluginData: AnyPluginData<any>,
  permission: string,
  matchParams: ExtendedMatchParams,
) {
  const config = await pluginData.config.getMatchingConfig(matchParams);
  return helpers.hasPermission(config, permission);
}

export async function sendSuccessMessage(
  pluginData: AnyPluginData<any>,
  channel: TextBasedChannel,
  body: string,
  allowedMentions?: MessageMentionOptions,
  responseInteraction?: ModalSubmitInteraction,
): Promise<Message | undefined> {
  const emoji = pluginData.fullConfig.success_emoji || undefined;
  const formattedBody = successMessage(body, emoji);
  const content: MessageCreateOptions = allowedMentions
    ? { content: formattedBody, allowedMentions }
    : { content: formattedBody };

  if (responseInteraction) {
    await responseInteraction
      .editReply({ content: formattedBody, embeds: [], components: [] })
      .catch((err) => logger.error(`Interaction reply failed: ${err}`));
  } else {
    return channel
      .send({ ...content }) // Force line break
      .catch((err) => {
        const channelInfo = "guild" in channel ? `${channel.id} (${channel.guild.id})` : channel.id;
        logger.warn(`Failed to send success message to ${channelInfo}): ${err.code} ${err.message}`);
        return undefined;
      });
  }
}

export async function sendErrorMessage(
  pluginData: AnyPluginData<any>,
  channel: TextBasedChannel,
  body: string,
  allowedMentions?: MessageMentionOptions,
  responseInteraction?: ModalSubmitInteraction,
): Promise<Message | undefined> {
  const emoji = pluginData.fullConfig.error_emoji || undefined;
  const formattedBody = errorMessage(body, emoji);
  const content: MessageCreateOptions = allowedMentions
    ? { content: formattedBody, allowedMentions }
    : { content: formattedBody };

  if (responseInteraction) {
    await responseInteraction
      .editReply({ content: formattedBody, embeds: [], components: [] })
      .catch((err) => logger.error(`Interaction reply failed: ${err}`));
  } else {
    return channel
      .send({ ...content }) // Force line break
      .catch((err) => {
        const channelInfo = "guild" in channel ? `${channel.id} (${channel.guild.id})` : channel.id;
        logger.warn(`Failed to send error message to ${channelInfo}): ${err.code} ${err.message}`);
        return undefined;
      });
  }
}

export function getBaseUrl(pluginData: AnyPluginData<any>) {
  const knub = pluginData.getKnubInstance() as TZeppelinKnub;
  // @ts-expect-error
  return knub.getGlobalConfig().url;
}

export function isOwner(pluginData: AnyPluginData<any>, userId: string) {
  const knub = pluginData.getKnubInstance() as TZeppelinKnub;
  // @ts-expect-error
  const owners = knub.getGlobalConfig()?.owners;
  if (!owners) {
    return false;
  }

  return owners.includes(userId);
}

export const isStaffPreFilter = (_, context: CommandContext<any>) => {
  return isStaff(context.message.author.id);
};

type AnyFn = (...args: any[]) => any;

/**
 * Creates a public plugin function out of a function with pluginData as the first parameter
 */
export function mapToPublicFn<T extends AnyFn>(inputFn: T) {
  return (pluginData) => {
    return (...args: Tail<Parameters<typeof inputFn>>): ReturnType<typeof inputFn> => {
      return inputFn(pluginData, ...args);
    };
  };
}
