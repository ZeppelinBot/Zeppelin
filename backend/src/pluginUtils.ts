/**
 * @file Utility functions that are plugin-instance-specific (i.e. use PluginData)
 */

import { GuildMember, Message, MessageMentionOptions, MessageOptions, TextChannel } from "discord.js";
import * as t from "io-ts";
import { CommandContext, configUtils, ConfigValidationError, GuildPluginData, helpers, PluginOptions } from "knub";
import { PluginOverrideCriteria } from "knub/dist/config/configTypes";
import { ExtendedMatchParams } from "knub/dist/config/PluginConfigManager"; // TODO: Export from Knub index
import { AnyPluginData } from "knub/dist/plugins/PluginData";
import { logger } from "./logger";
import { ZeppelinPlugin } from "./plugins/ZeppelinPlugin";
import { TZeppelinKnub } from "./types";
import { deepKeyIntersect, errorMessage, successMessage, tDeepPartial, tNullable } from "./utils";
import { Tail } from "./utils/typeUtils";
import { decodeAndValidateStrict, StrictValidationError, validate } from "./validatorUtils";

const { getMemberLevel } = helpers;

export function canActOn(
  pluginData: GuildPluginData<any>,
  member1: GuildMember,
  member2: GuildMember,
  allowSameLevel = false,
) {
  if (member2.id === pluginData.client.user!.id) {
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

export function getPluginConfigPreprocessor(
  blueprint: ZeppelinPlugin,
  customPreprocessor?: ZeppelinPlugin["configPreprocessor"],
) {
  return async (options: PluginOptions<any>, strict?: boolean) => {
    // 1. Validate the basic structure of plugin config
    const basicOptionsValidation = validate(BasicPluginStructureType, options);
    if (basicOptionsValidation instanceof StrictValidationError) {
      throw strictValidationErrorToConfigValidationError(basicOptionsValidation);
    }

    // 2. Validate config/overrides against *partial* config schema. This ensures valid properties have valid types.
    const partialConfigSchema = tDeepPartial(blueprint.configSchema);

    if (options.config) {
      const partialConfigValidation = validate(partialConfigSchema, options.config);
      if (partialConfigValidation instanceof StrictValidationError) {
        throw strictValidationErrorToConfigValidationError(partialConfigValidation);
      }
    }

    if (options.overrides) {
      for (const override of options.overrides) {
        // Validate criteria and extra criteria
        // FIXME: This is ugly
        for (const key of Object.keys(override)) {
          if (!validTopLevelOverrideKeys.includes(key)) {
            if (strict) {
              throw new ConfigValidationError(`Unknown override criterion '${key}'`);
            }

            delete override[key];
          }
        }
        if (override.extra != null) {
          for (const extraCriterion of Object.keys(override.extra)) {
            if (!blueprint.customOverrideCriteriaFunctions?.[extraCriterion]) {
              if (strict) {
                throw new ConfigValidationError(`Unknown override extra criterion '${extraCriterion}'`);
              }

              delete override.extra[extraCriterion];
            }
          }
        }

        // Validate override config
        const partialOverrideConfigValidation = decodeAndValidateStrict(partialConfigSchema, override.config || {});
        if (partialOverrideConfigValidation instanceof StrictValidationError) {
          throw strictValidationErrorToConfigValidationError(partialOverrideConfigValidation);
        }
      }
    }

    // 3. Run custom preprocessor, if any
    if (customPreprocessor) {
      options = await customPreprocessor(options);
    }

    // 4. Merge with default options and validate/decode the entire config
    let decodedConfig = {};
    const decodedOverrides: Array<PluginOverrideCriteria<unknown> & { config: any }> = [];

    if (options.config) {
      decodedConfig = blueprint.configSchema
        ? decodeAndValidateStrict(blueprint.configSchema, options.config)
        : options.config;
      if (decodedConfig instanceof StrictValidationError) {
        throw strictValidationErrorToConfigValidationError(decodedConfig);
      }
    }

    if (options.overrides) {
      for (const override of options.overrides) {
        const overrideConfigMergedWithBaseConfig = configUtils.mergeConfig(options.config || {}, override.config || {});
        const decodedOverrideConfig = blueprint.configSchema
          ? decodeAndValidateStrict(blueprint.configSchema, overrideConfigMergedWithBaseConfig)
          : overrideConfigMergedWithBaseConfig;
        if (decodedOverrideConfig instanceof StrictValidationError) {
          throw strictValidationErrorToConfigValidationError(decodedOverrideConfig);
        }
        decodedOverrides.push({
          ...override,
          config: deepKeyIntersect(decodedOverrideConfig, override.config || {}),
        });
      }
    }

    return {
      config: decodedConfig,
      overrides: decodedOverrides,
    };
  };
}

export async function sendSuccessMessage(
  pluginData: AnyPluginData<any>,
  channel: TextChannel,
  body: string,
  allowedMentions?: MessageMentionOptions,
): Promise<Message | undefined> {
  const emoji = pluginData.fullConfig.success_emoji || undefined;
  const formattedBody = successMessage(body, emoji);
  const content: MessageOptions = allowedMentions
    ? { content: formattedBody, allowedMentions }
    : { content: formattedBody };

  return channel
    .send({ ...content }) // Force line break
    .catch((err) => {
      const channelInfo = channel.guild ? `${channel.id} (${channel.guild.id})` : channel.id;
      logger.warn(`Failed to send success message to ${channelInfo}): ${err.code} ${err.message}`);
      return undefined;
    });
}

export async function sendErrorMessage(
  pluginData: AnyPluginData<any>,
  channel: TextChannel,
  body: string,
  allowedMentions?: MessageMentionOptions,
): Promise<Message | undefined> {
  const emoji = pluginData.fullConfig.error_emoji || undefined;
  const formattedBody = errorMessage(body, emoji);
  const content: MessageOptions = allowedMentions
    ? { content: formattedBody, allowedMentions }
    : { content: formattedBody };

  return channel
    .send({ ...content }) // Force line break
    .catch((err) => {
      const channelInfo = channel.guild ? `${channel.id} (${channel.guild.id})` : channel.id;
      logger.warn(`Failed to send error message to ${channelInfo}): ${err.code} ${err.message}`);
      return undefined;
    });
}

export function getBaseUrl(pluginData: AnyPluginData<any>) {
  const knub = pluginData.getKnubInstance() as TZeppelinKnub;
  return knub.getGlobalConfig().url;
}

export function isOwner(pluginData: AnyPluginData<any>, userId: string) {
  const knub = pluginData.getKnubInstance() as TZeppelinKnub;
  const owners = knub.getGlobalConfig()?.owners;
  if (!owners) {
    return false;
  }

  return owners.includes(userId);
}

export const isOwnerPreFilter = (_, context: CommandContext<any>) => {
  return isOwner(context.pluginData, context.message.author.id);
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
