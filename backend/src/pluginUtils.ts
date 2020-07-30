/**
 * @file Utility functions that are plugin-instance-specific (i.e. use PluginData)
 */

import { Member } from "eris";
import { CommandContext, configUtils, helpers, PluginBlueprint, PluginData, PluginOptions } from "knub";
import { decodeAndValidateStrict, StrictValidationError, validate } from "./validatorUtils";
import { deepKeyIntersect, errorMessage, successMessage, tNullable } from "./utils";
import { ZeppelinPluginBlueprint } from "./plugins/ZeppelinPluginBlueprint";
import { TZeppelinKnub } from "./types";
import { ExtendedMatchParams } from "knub/dist/config/PluginConfigManager"; // TODO: Export from Knub index
import * as t from "io-ts";
import { PluginOverrideCriteria } from "knub/dist/config/configTypes";

const { getMemberLevel } = helpers;

export function canActOn(pluginData: PluginData<any>, member1: Member, member2: Member, allowSameLevel = false) {
  if (member2.id === pluginData.client.user.id) {
    return false;
  }

  const ourLevel = getMemberLevel(pluginData, member1);
  const memberLevel = getMemberLevel(pluginData, member2);
  return allowSameLevel ? ourLevel >= memberLevel : ourLevel > memberLevel;
}

export function hasPermission(pluginData: PluginData<any>, permission: string, matchParams: ExtendedMatchParams) {
  const config = pluginData.config.getMatchingConfig(matchParams);
  return helpers.hasPermission(config, permission);
}

const PluginOverrideCriteriaType = t.recursion("PluginOverrideCriteriaType", () =>
  t.type({
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

const BasicPluginStructureType = t.type({
  enabled: tNullable(t.boolean),
  config: tNullable(t.unknown),
  overrides: tNullable(t.array(PluginOverrideCriteriaType)),
  replaceDefaultOverrides: tNullable(t.boolean),
});

export function getPluginConfigPreprocessor(
  blueprint: ZeppelinPluginBlueprint,
  customPreprocessor?: PluginBlueprint<any>["configPreprocessor"],
) {
  return async (options: PluginOptions<any>) => {
    const basicOptionsValidation = validate(BasicPluginStructureType, options);
    if (basicOptionsValidation instanceof StrictValidationError) {
      throw basicOptionsValidation;
    }

    if (customPreprocessor) {
      options = await customPreprocessor(options);
    }

    let decodedConfig = {};
    const decodedOverrides = [];

    if (options.config) {
      decodedConfig = blueprint.configSchema
        ? decodeAndValidateStrict(blueprint.configSchema, options.config)
        : options.config;
      if (decodedConfig instanceof StrictValidationError) {
        throw decodedConfig;
      }
    }

    if (options.overrides) {
      for (const override of options.overrides || []) {
        const overrideConfigMergedWithBaseConfig = configUtils.mergeConfig(options.config, override.config || {});
        const decodedOverrideConfig = blueprint.configSchema
          ? decodeAndValidateStrict(blueprint.configSchema, overrideConfigMergedWithBaseConfig)
          : overrideConfigMergedWithBaseConfig;
        if (decodedOverrideConfig instanceof StrictValidationError) {
          throw decodedOverrideConfig;
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

export function sendSuccessMessage(pluginData: PluginData<any>, channel, body) {
  const emoji = pluginData.guildConfig.success_emoji || undefined;
  return channel.createMessage(successMessage(body, emoji));
}

export function sendErrorMessage(pluginData: PluginData<any>, channel, body) {
  const emoji = pluginData.guildConfig.error_emoji || undefined;
  return channel.createMessage(errorMessage(body, emoji));
}

export function getBaseUrl(pluginData: PluginData<any>) {
  const knub = pluginData.getKnubInstance() as TZeppelinKnub;
  return knub.getGlobalConfig().url;
}

export function isOwner(pluginData: PluginData<any>, userId: string) {
  const knub = pluginData.getKnubInstance() as TZeppelinKnub;
  const owners = knub.getGlobalConfig().owners;
  if (!owners) {
    return false;
  }

  return owners.includes(userId);
}

export const isOwnerPreFilter = (_, context: CommandContext<any>) => {
  return isOwner(context.pluginData, context.message.author.id);
};
