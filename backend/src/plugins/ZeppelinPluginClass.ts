import { BasePluginType, PluginClass, PluginOptions } from "knub";
import * as t from "io-ts";
import { TZeppelinKnub, ZeppelinPluginInfo } from "../types";
import { pluginConfigPreprocessor } from "../pluginUtils";

export class ZeppelinPluginClass<TPluginType extends BasePluginType = BasePluginType> extends PluginClass<TPluginType> {
  public static pluginInfo: ZeppelinPluginInfo;
  public static showInDocs: boolean = true;
  public static configSchema: t.TypeC<any>;

  protected readonly knub: TZeppelinKnub;

  public static configPreprocessor(options: PluginOptions<any>) {
    return pluginConfigPreprocessor.bind(this)(options);
  }
}
