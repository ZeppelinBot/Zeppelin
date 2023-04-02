/**
 * @file Utility functions that are plugin-instance-specific (i.e. use PluginData)
 */

import {
  GuildMember,
  Message,
  MessageCreateOptions,
  MessageMentionOptions,
  PermissionsBitField,
  TextBasedChannel,
} from "discord.js";
import * as t from "io-ts";
import {
  AnyPluginData,
  CommandContext,
  ConfigValidationError,
  ExtendedMatchParams,
  GuildPluginData,
  helpers,
  PluginOverrideCriteria,
} from "knub";
import { logger } from "./logger";
import { isStaff } from "./staff";
import { TZeppelinKnub } from "./types";
import { errorMessage, successMessage, tNullable } from "./utils";
import { Tail } from "./utils/typeUtils";
import { parseIoTsSchema, StrictValidationError } from "./validatorUtils";

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

const PluginOverrideCriteriaType: t.Type<PluginOverrideCriteria<unknown>> = t.recursion(
  "PluginOverrideCriteriaType",
  () =>
    t.partial({
      channel: tNullable(t.union([t.string, t.array(t.string)])),
      category: tNullable(t.union([t.string, t.array(t.string)])),
      level: tNullable(t.union([t.string, t.array(t.string)])),
      user: tNullable(t.union([t.string, t.array(t.string)])),
      role: tNullable(t.union([t.string, t.array(t.string)])),

      all: tNullable(t.array(PluginOverrideCriteriaType)),
      any: tNullable(t.array(PluginOverrideCriteriaType)),
      not: tNullable(PluginOverrideCriteriaType),

      extra: t.unknown,
    }),
);

const validTopLevelOverrideKeys = [
  "channel",
  "category",
  "thread",
  "is_thread",
  "level",
  "user",
  "role",
  "all",
  "any",
  "not",
  "extra",
  "config",
];

const BasicPluginStructureType = t.type({
  enabled: tNullable(t.boolean),
  config: tNullable(t.unknown),
  overrides: tNullable(t.array(t.union([PluginOverrideCriteriaType, t.type({ config: t.unknown })]))),
  replaceDefaultOverrides: tNullable(t.boolean),
});

export function strictValidationErrorToConfigValidationError(err: StrictValidationError) {
  return new ConfigValidationError(
    err
      .getErrors()
      .map((e) => e.toString())
      .join("\n"),
  );
}

export function makeIoTsConfigParser<Schema extends t.Type<any>>(schema: Schema): (input: unknown) => t.TypeOf<Schema> {
  return (input: unknown) => {
    try {
      return parseIoTsSchema(schema, input);
    } catch (err) {
      if (err instanceof StrictValidationError) {
        throw strictValidationErrorToConfigValidationError(err);
      }
      throw err;
    }
  };
}

export async function sendSuccessMessage(
  pluginData: AnyPluginData<any>,
  channel: TextBasedChannel,
  body: string,
  allowedMentions?: MessageMentionOptions,
): Promise<Message | undefined> {
  const emoji = pluginData.fullConfig.success_emoji || undefined;
  const formattedBody = successMessage(body, emoji);
  const content: MessageCreateOptions = allowedMentions
    ? { content: formattedBody, allowedMentions }
    : { content: formattedBody };

  return channel
    .send({ ...content }) // Force line break
    .catch((err) => {
      const channelInfo = "guild" in channel ? `${channel.id} (${channel.guild.id})` : channel.id;
      logger.warn(`Failed to send success message to ${channelInfo}): ${err.code} ${err.message}`);
      return undefined;
    });
}

export async function sendErrorMessage(
  pluginData: AnyPluginData<any>,
  channel: TextBasedChannel,
  body: string,
  allowedMentions?: MessageMentionOptions,
): Promise<Message | undefined> {
  const emoji = pluginData.fullConfig.error_emoji || undefined;
  const formattedBody = errorMessage(body, emoji);
  const content: MessageCreateOptions = allowedMentions
    ? { content: formattedBody, allowedMentions }
    : { content: formattedBody };

  return channel
    .send({ ...content }) // Force line break
    .catch((err) => {
      const channelInfo = "guild" in channel ? `${channel.id} (${channel.guild.id})` : channel.id;
      logger.warn(`Failed to send error message to ${channelInfo}): ${err.code} ${err.message}`);
      return undefined;
    });
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
