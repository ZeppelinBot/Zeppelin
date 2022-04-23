import * as t from "io-ts";
import {
  BasePluginType,
  GlobalPluginBlueprint,
  GlobalPluginData,
  GuildPluginBlueprint,
  GuildPluginData,
  typedGlobalPlugin,
  typedGuildPlugin,
} from "knub";
import { PluginOptions } from "knub/dist/config/configTypes";
import { Awaitable } from "knub/dist/utils";
import { getPluginConfigPreprocessor } from "../pluginUtils";
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

  configPreprocessor?: (
    options: PluginOptions<TPluginData["_pluginType"]>,
    strict?: boolean,
  ) => Awaitable<PluginOptions<TPluginData["_pluginType"]>>;
}

export function zeppelinGuildPlugin<TBlueprint extends ZeppelinGuildPluginBlueprint>(
  blueprint: TBlueprint,
): TBlueprint & { configPreprocessor: ZeppelinGuildPluginBlueprint["configPreprocessor"] };

export function zeppelinGuildPlugin<TPluginType extends BasePluginType>(): <
  TBlueprint extends ZeppelinGuildPluginBlueprint<GuildPluginData<TPluginType>>,
>(
  blueprint: TBlueprint,
) => TBlueprint & {
  configPreprocessor: ZeppelinGuildPluginBlueprint<GuildPluginData<TPluginType>>["configPreprocessor"];
};

export function zeppelinGuildPlugin(...args) {
  if (args.length) {
    const blueprint = typedGuildPlugin(
      ...(args as Parameters<typeof typedGuildPlugin>),
    ) as unknown as ZeppelinGuildPluginBlueprint;
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
  extends GlobalPluginBlueprint<GlobalPluginData<TPluginType>> {
  configSchema: t.TypeC<any>;
  configPreprocessor?: (options: PluginOptions<TPluginType>, strict?: boolean) => Awaitable<PluginOptions<TPluginType>>;
}

export function zeppelinGlobalPlugin<TBlueprint extends ZeppelinGlobalPluginBlueprint>(
  blueprint: TBlueprint,
): TBlueprint & { configPreprocessor: ZeppelinGlobalPluginBlueprint["configPreprocessor"] };

export function zeppelinGlobalPlugin<TPluginType extends BasePluginType>(): <
  TBlueprint extends ZeppelinGlobalPluginBlueprint<TPluginType>,
>(
  blueprint: TBlueprint,
) => TBlueprint & {
  configPreprocessor: ZeppelinGlobalPluginBlueprint<TPluginType>["configPreprocessor"];
};

export function zeppelinGlobalPlugin(...args) {
  if (args.length) {
    const blueprint = typedGlobalPlugin(
      ...(args as Parameters<typeof typedGlobalPlugin>),
    ) as unknown as ZeppelinGlobalPluginBlueprint;
    // @ts-ignore FIXME: Check the types here
    blueprint.configPreprocessor = getPluginConfigPreprocessor(blueprint, blueprint.configPreprocessor);
    return blueprint;
  } else {
    return zeppelinGlobalPlugin as (name, blueprint) => ZeppelinGlobalPluginBlueprint;
  }
}
