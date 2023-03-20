import * as t from "io-ts";
import {
  BasePluginType,
  globalPlugin,
  GlobalPluginBlueprint,
  GlobalPluginData,
  guildPlugin,
  GuildPluginBlueprint,
  GuildPluginData,
} from "knub";
import { PluginOptions } from "knub/dist/config/configTypes";
import { Awaitable } from "knub/dist/utils";
import { getPluginConfigParser } from "../pluginUtils";
import { TMarkdown } from "../types";

/**
 * GUILD PLUGINS
 */

export interface ZeppelinGuildPluginBlueprint<TPluginData extends GuildPluginData<any> = GuildPluginData<any>>
  extends GuildPluginBlueprint<TPluginData> {
  configSchema: t.TypeC<any>;
  showInDocs?: boolean;

  info?: {
    prettyName: string;
    description?: TMarkdown;
    usageGuide?: TMarkdown;
    configurationGuide?: TMarkdown;
    legacy?: boolean | string;
  };

  // FIXME: need proper typings here
  configParser: (
    options: TPluginData["_pluginType"]["config"],
    strict?: boolean,
  ) => Awaitable<PluginOptions<TPluginData["_pluginType"]>>;
}

export function zeppelinGuildPlugin<TBlueprint extends ZeppelinGuildPluginBlueprint>(
  blueprint: TBlueprint,
): TBlueprint & { configParser: ZeppelinGuildPluginBlueprint["configParser"] };

export function zeppelinGuildPlugin<TPluginType extends BasePluginType>(): <
  TBlueprint extends ZeppelinGuildPluginBlueprint<GuildPluginData<TPluginType>>,
>(
  blueprint: TBlueprint,
) => TBlueprint & {
  configParser: ZeppelinGuildPluginBlueprint<GuildPluginData<TPluginType>>["configParser"];
};

export function zeppelinGuildPlugin(...args) {
  if (args.length) {
    const blueprint = guildPlugin(
      ...(args as Parameters<typeof guildPlugin>),
    ) as unknown as ZeppelinGuildPluginBlueprint;
    blueprint.configParser = <any>getPluginConfigParser(blueprint, blueprint.configParser);
    return blueprint;
  } else {
    return zeppelinGuildPlugin as (name, blueprint) => ZeppelinGuildPluginBlueprint;
  }
}

/**
 * GLOBAL PLUGINS
 */

export interface ZeppelinGlobalPluginBlueprint<TPluginType extends BasePluginType = BasePluginType>
  extends GlobalPluginBlueprint<GlobalPluginData<TPluginType>> {
  configSchema: t.TypeC<any>;
  // FIXME: need proper typings here
  configParser: (options: TPluginType["config"], strict?: boolean) => Awaitable<PluginOptions<TPluginType>>;
}

export function zeppelinGlobalPlugin<TBlueprint extends ZeppelinGlobalPluginBlueprint>(
  blueprint: TBlueprint,
): TBlueprint & { configParser: ZeppelinGlobalPluginBlueprint["configParser"] };

export function zeppelinGlobalPlugin<TPluginType extends BasePluginType>(): <
  TBlueprint extends ZeppelinGlobalPluginBlueprint<TPluginType>,
>(
  blueprint: TBlueprint,
) => TBlueprint & {
  configParser: ZeppelinGlobalPluginBlueprint<TPluginType>["configParser"];
};

export function zeppelinGlobalPlugin(...args) {
  if (args.length) {
    const blueprint = globalPlugin(
      ...(args as Parameters<typeof globalPlugin>),
    ) as unknown as ZeppelinGlobalPluginBlueprint;
    // @ts-expect-error FIXME: Check the types here
    blueprint.configParser = getPluginConfigParser(blueprint, blueprint.configParser);
    return blueprint;
  } else {
    return zeppelinGlobalPlugin as (name, blueprint) => ZeppelinGlobalPluginBlueprint;
  }
}
