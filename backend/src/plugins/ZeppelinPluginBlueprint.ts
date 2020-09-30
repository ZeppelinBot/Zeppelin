import { BasePluginType, globalPlugin, GlobalPluginBlueprint, guildPlugin, GuildPluginBlueprint } from "knub";
import * as t from "io-ts";
import { getPluginConfigPreprocessor } from "../pluginUtils";
import { TMarkdown } from "../types";

/**
 * GUILD PLUGINS
 */

export interface ZeppelinGuildPluginBlueprint<TPluginType extends BasePluginType = BasePluginType>
  extends GuildPluginBlueprint<TPluginType> {
  configSchema: t.TypeC<any>;
  showInDocs?: boolean;

  info?: {
    prettyName: string;
    description?: TMarkdown;
    usageGuide?: TMarkdown;
    configurationGuide?: TMarkdown;
  };
}

export function zeppelinGuildPlugin<TPartialBlueprint extends Omit<ZeppelinGuildPluginBlueprint, "name">>(
  name: string,
  blueprint: TPartialBlueprint,
): TPartialBlueprint & { name: string; configPreprocessor: ZeppelinGuildPluginBlueprint["configPreprocessor"] };

export function zeppelinGuildPlugin<TPluginType extends BasePluginType>(): <
  TPartialBlueprint extends Omit<ZeppelinGuildPluginBlueprint<TPluginType>, "name">
>(
  name: string,
  blueprint: TPartialBlueprint,
) => TPartialBlueprint & {
  name: string;
  configPreprocessor: ZeppelinGuildPluginBlueprint<TPluginType>["configPreprocessor"];
};

export function zeppelinGuildPlugin(...args) {
  if (args.length) {
    const blueprint = (guildPlugin(
      ...(args as Parameters<typeof guildPlugin>),
    ) as unknown) as ZeppelinGuildPluginBlueprint;
    blueprint.configPreprocessor = getPluginConfigPreprocessor(blueprint, blueprint.configPreprocessor);
    return blueprint;
  } else {
    return zeppelinGuildPlugin as (name, blueprint) => ZeppelinGuildPluginBlueprint;
  }
}

/**
 * GLOBAL PLUGINS
 */

export interface ZeppelinGlobalPluginBlueprint<TPluginType extends BasePluginType = BasePluginType>
  extends GlobalPluginBlueprint<TPluginType> {
  configSchema: t.TypeC<any>;
}

export function zeppelinGlobalPlugin<TPartialBlueprint extends Omit<ZeppelinGlobalPluginBlueprint, "name">>(
  name: string,
  blueprint: TPartialBlueprint,
): TPartialBlueprint & { name: string; configPreprocessor: ZeppelinGlobalPluginBlueprint["configPreprocessor"] };

export function zeppelinGlobalPlugin<TPluginType extends BasePluginType>(): <
  TPartialBlueprint extends Omit<ZeppelinGlobalPluginBlueprint<TPluginType>, "name">
>(
  name: string,
  blueprint: TPartialBlueprint,
) => TPartialBlueprint & {
  name: string;
  configPreprocessor: ZeppelinGlobalPluginBlueprint<TPluginType>["configPreprocessor"];
};

export function zeppelinGlobalPlugin(...args) {
  if (args.length) {
    const blueprint = (globalPlugin(
      ...(args as Parameters<typeof globalPlugin>),
    ) as unknown) as ZeppelinGlobalPluginBlueprint;
    blueprint.configPreprocessor = getPluginConfigPreprocessor(blueprint, blueprint.configPreprocessor);
    return blueprint;
  } else {
    return zeppelinGlobalPlugin as (name, blueprint) => ZeppelinGlobalPluginBlueprint;
  }
}
