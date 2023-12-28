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
import { TMarkdown } from "../types";

/**
 * GUILD PLUGINS
 */

export interface ZeppelinGuildPluginBlueprint<TPluginData extends GuildPluginData<any> = GuildPluginData<any>>
  extends GuildPluginBlueprint<TPluginData> {
  showInDocs?: boolean;
  info?: {
    prettyName: string;
    description?: TMarkdown;
    usageGuide?: TMarkdown;
    configurationGuide?: TMarkdown;
    legacy?: boolean | string;
    configSchema?: t.Type<any>;
  };
}

export function zeppelinGuildPlugin<TBlueprint extends ZeppelinGuildPluginBlueprint>(blueprint: TBlueprint): TBlueprint;

export function zeppelinGuildPlugin<TPluginType extends BasePluginType>(): <
  TBlueprint extends ZeppelinGuildPluginBlueprint<GuildPluginData<TPluginType>>,
>(
  blueprint: TBlueprint,
) => TBlueprint;

export function zeppelinGuildPlugin(...args) {
  if (args.length) {
    const blueprint = guildPlugin(
      ...(args as Parameters<typeof guildPlugin>),
    ) as unknown as ZeppelinGuildPluginBlueprint;
    return blueprint;
  } else {
    return zeppelinGuildPlugin as (name, blueprint) => ZeppelinGuildPluginBlueprint;
  }
}

/**
 * GLOBAL PLUGINS
 */

export interface ZeppelinGlobalPluginBlueprint<TPluginType extends BasePluginType = BasePluginType>
  extends GlobalPluginBlueprint<GlobalPluginData<TPluginType>> {}

export function zeppelinGlobalPlugin<TBlueprint extends ZeppelinGlobalPluginBlueprint>(
  blueprint: TBlueprint,
): TBlueprint;

export function zeppelinGlobalPlugin<TPluginType extends BasePluginType>(): <
  TBlueprint extends ZeppelinGlobalPluginBlueprint<TPluginType>,
>(
  blueprint: TBlueprint,
) => TBlueprint;

export function zeppelinGlobalPlugin(...args) {
  if (args.length) {
    const blueprint = globalPlugin(
      ...(args as Parameters<typeof globalPlugin>),
    ) as unknown as ZeppelinGlobalPluginBlueprint;
    return blueprint;
  } else {
    return zeppelinGlobalPlugin as (name, blueprint) => ZeppelinGlobalPluginBlueprint;
  }
}
