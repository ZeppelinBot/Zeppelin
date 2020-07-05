/**
 * @file Utility functions that are plugin-instance-specific (i.e. use PluginData)
 */

import { Member, TextChannel } from "eris";
import { configUtils, helpers, Knub, PluginData, PluginOptions } from "knub";
import { decodeAndValidateStrict, StrictValidationError } from "./validatorUtils";
import { deepKeyIntersect, errorMessage, successMessage } from "./utils";
import { ZeppelinPluginClass } from "./plugins/ZeppelinPluginClass";
import { ZeppelinPluginBlueprint } from "./plugins/ZeppelinPluginBlueprint";
import { IZeppelinGlobalConfig, IZeppelinGuildConfig, TZeppelinKnub } from "./types";

const { getMemberLevel } = helpers;

export function canActOn(pluginData: PluginData<any>, member1: Member, member2: Member, allowSameLevel = false) {
  if (member2.id === this.client.user.id) {
    return false;
  }

  const ourLevel = getMemberLevel(pluginData, member1);
  const memberLevel = getMemberLevel(pluginData, member2);
  return allowSameLevel ? ourLevel >= memberLevel : ourLevel > memberLevel;
}

export function pluginConfigPreprocessor(
  this: typeof ZeppelinPluginClass | ZeppelinPluginBlueprint,
  options: PluginOptions<any>,
) {
  const decodedConfig = this.configSchema ? decodeAndValidateStrict(this.configSchema, options.config) : options.config;
  if (decodedConfig instanceof StrictValidationError) {
    throw decodedConfig;
  }

  const decodedOverrides = [];
  for (const override of options.overrides || []) {
    const overrideConfigMergedWithBaseConfig = configUtils.mergeConfig(options.config, override.config || {});
    const decodedOverrideConfig = this.configSchema
      ? decodeAndValidateStrict(this.configSchema, overrideConfigMergedWithBaseConfig)
      : overrideConfigMergedWithBaseConfig;
    if (decodedOverrideConfig instanceof StrictValidationError) {
      throw decodedOverrideConfig;
    }
    decodedOverrides.push({
      ...override,
      config: deepKeyIntersect(decodedOverrideConfig, override.config || {}),
    });
  }

  return {
    config: decodedConfig,
    overrides: decodedOverrides,
  };
}

export function sendSuccessMessage(pluginData: PluginData<any>, channel, body) {
  const emoji = pluginData.guildConfig.success_emoji || undefined;
  channel.createMessage(successMessage(body, emoji));
}

export function sendErrorMessage(pluginData: PluginData<any>, channel, body) {
  const emoji = pluginData.guildConfig.error_emoji || undefined;
  channel.createMessage(errorMessage(body, emoji));
}

export function getBaseUrl(pluginData: PluginData<any>) {
  const knub = pluginData.getKnubInstance() as TZeppelinKnub;
  return knub.getGlobalConfig().url;
}
