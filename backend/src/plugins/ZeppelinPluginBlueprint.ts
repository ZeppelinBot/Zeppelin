import { BasePluginType, plugin, PluginBlueprint } from "knub";
import * as t from "io-ts";
import { pluginConfigPreprocessor } from "../pluginUtils";

export interface ZeppelinPluginBlueprint<TPluginType extends BasePluginType = BasePluginType>
  extends PluginBlueprint<TPluginType> {
  configSchema?: t.TypeC<any>;
  showInDocs?: boolean;
}

export function zeppelinPlugin<TPartialBlueprint extends Omit<ZeppelinPluginBlueprint, "name">>(
  name: string,
  blueprint: TPartialBlueprint,
): TPartialBlueprint & { name: string };

export function zeppelinPlugin<TPluginType extends BasePluginType>(): <
  TPartialBlueprint extends Omit<ZeppelinPluginBlueprint<TPluginType>, "name">
>(
  name: string,
  blueprint: TPartialBlueprint,
) => TPartialBlueprint & { name: string };

export function zeppelinPlugin(...args) {
  if (args.length) {
    const blueprint: ZeppelinPluginBlueprint = plugin(...(args as Parameters<typeof plugin>));
    blueprint.configPreprocessor = pluginConfigPreprocessor.bind(blueprint);
    return blueprint;
  } else {
    return zeppelinPlugin;
  }
}
