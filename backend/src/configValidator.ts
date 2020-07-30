import * as t from "io-ts";
import { guildPlugins } from "./plugins/availablePlugins";
import { decodeAndValidateStrict, StrictValidationError } from "./validatorUtils";
import { ZeppelinPlugin } from "./plugins/ZeppelinPlugin";
import { IZeppelinGuildConfig } from "./types";
import { configUtils, ConfigValidationError, PluginOptions } from "knub";

const pluginNameToPlugin = new Map<string, ZeppelinPlugin>();
for (const plugin of guildPlugins) {
  pluginNameToPlugin.set(plugin.name, plugin);
}

const guildConfigRootSchema = t.type({
  prefix: t.string,
  levels: t.record(t.string, t.number),
  success_emoji: t.string,
  plugins: t.record(t.string, t.unknown),
});
const partialGuildConfigRootSchema = t.partial(guildConfigRootSchema.props);

const globalConfigRootSchema = t.type({
  url: t.string,
  owners: t.array(t.string),
  plugins: t.record(t.string, t.unknown),
});

const partialMegaTest = t.partial({ name: t.string });

export async function validateGuildConfig(config: any): Promise<string | null> {
  const validationResult = decodeAndValidateStrict(partialGuildConfigRootSchema, config);
  if (validationResult instanceof StrictValidationError) return validationResult.getErrors();

  const guildConfig = config as IZeppelinGuildConfig;

  if (guildConfig.plugins) {
    for (const [pluginName, pluginOptions] of Object.entries(guildConfig.plugins)) {
      if (!pluginNameToPlugin.has(pluginName)) {
        return `Unknown plugin: ${pluginName}`;
      }

      const plugin = pluginNameToPlugin.get(pluginName);
      try {
        const mergedOptions = configUtils.mergeConfig(plugin.defaultOptions || {}, pluginOptions);
        await plugin.configPreprocessor(mergedOptions as PluginOptions<any>);
      } catch (err) {
        if (err instanceof ConfigValidationError) {
          return `${pluginName}: ${err.toString()}`;
        }

        throw err;
      }
    }
  }

  return null;
}
