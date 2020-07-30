import { BasePluginType, plugin, PluginBlueprint } from "knub";
import * as t from "io-ts";
import { getPluginConfigPreprocessor } from "../pluginUtils";
import { TMarkdown } from "../types";

export interface ZeppelinPluginBlueprint<TPluginType extends BasePluginType = BasePluginType>
  extends PluginBlueprint<TPluginType> {
  configSchema: t.TypeC<any>;
  showInDocs?: boolean;

  info?: {
    prettyName: string;
    description?: TMarkdown;
    usageGuide?: TMarkdown;
    configurationGuide?: TMarkdown;
  };
}

export function zeppelinPlugin<TPartialBlueprint extends Omit<ZeppelinPluginBlueprint, "name">>(
  name: string,
  blueprint: TPartialBlueprint,
): TPartialBlueprint & { name: string; configPreprocessor: ZeppelinPluginBlueprint["configPreprocessor"] };

export function zeppelinPlugin<TPluginType extends BasePluginType>(): <
  TPartialBlueprint extends Omit<ZeppelinPluginBlueprint<TPluginType>, "name">
>(
  name: string,
  blueprint: TPartialBlueprint,
) => TPartialBlueprint & {
  name: string;
  configPreprocessor: ZeppelinPluginBlueprint<TPluginType>["configPreprocessor"];
};

export function zeppelinPlugin(...args) {
  if (args.length) {
    const blueprint = (plugin(...(args as Parameters<typeof plugin>)) as unknown) as ZeppelinPluginBlueprint;
    blueprint.configPreprocessor = getPluginConfigPreprocessor(blueprint, blueprint.configPreprocessor);
    return blueprint;
  } else {
    return zeppelinPlugin as (name, blueprint) => ZeppelinPluginBlueprint;
  }
}
