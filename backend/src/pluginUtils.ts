/**
 * @file Utility functions that are plugin-instance-specific (i.e. use PluginData)
 */

import {
  ChatInputCommandInteraction,
  GuildMember,
  InteractionReplyOptions,
  Message,
  MessageCreateOptions,
  PermissionsBitField,
  TextBasedChannel,
  User,
} from "discord.js";
import { AnyPluginData, CommandContext, ExtendedMatchParams, GuildPluginData, helpers } from "knub";
import { isStaff } from "./staff";
import { TZeppelinKnub } from "./types";
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

export function isContextInteraction(
  context: TextBasedChannel | Message | User | ChatInputCommandInteraction,
): context is ChatInputCommandInteraction {
  return "commandId" in context && !!context.commandId;
}

export function isContextMessage(
  context: TextBasedChannel | Message | User | ChatInputCommandInteraction,
): context is Message {
  return "content" in context || "embeds" in context;
}

export async function getContextChannel(
  context: TextBasedChannel | Message | User | ChatInputCommandInteraction,
): Promise<TextBasedChannel> {
  if (isContextInteraction(context)) {
    // context is ChatInputCommandInteraction
    return context.channel!;
  } else if ("username" in context) {
    // context is User
    return await (context as User).createDM();
  } else if ("send" in context) {
    // context is TextBaseChannel
    return context as TextBasedChannel;
  } else {
    // context is Message
    return context.channel;
  }
}

export async function sendContextResponse(
  context: TextBasedChannel | Message | User | ChatInputCommandInteraction,
  response: string | Omit<MessageCreateOptions, "flags"> | InteractionReplyOptions,
): Promise<Message> {
  if (isContextInteraction(context)) {
    const options = { ...(typeof response === "string" ? { content: response } : response), fetchReply: true };

    return (
      context.replied
        ? context.followUp(options)
        : context.deferred
        ? context.editReply(options)
        : context.reply(options)
    ) as Promise<Message>;
  }

  if (typeof response !== "string" && "ephemeral" in response) {
    delete response.ephemeral;
  }

  return (await getContextChannel(context)).send(response as string | Omit<MessageCreateOptions, "flags">);
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
