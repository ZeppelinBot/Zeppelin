import * as t from "io-ts";
import { pipe } from "fp-ts/lib/pipeable";
import { fold } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";
import { guildPlugins } from "./plugins/availablePlugins";
import { ZeppelinPluginClass } from "./plugins/ZeppelinPluginClass";
import { decodeAndValidateStrict, StrictValidationError } from "./validatorUtils";
import { ZeppelinPlugin } from "./plugins/ZeppelinPlugin";
import { getPluginName } from "knub/dist/plugins/pluginUtils";
import { IZeppelinGuildConfig } from "./types";
import { PluginOptions } from "knub";

const pluginNameToPlugin = new Map<string, ZeppelinPlugin>();
for (const plugin of guildPlugins) {
  const pluginName = getPluginName(plugin);
  pluginNameToPlugin.set(pluginName, plugin);
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

export function validateGuildConfig(config: any): string[] | null {
  const validationResult = decodeAndValidateStrict(partialGuildConfigRootSchema, config);
  if (validationResult instanceof StrictValidationError) return validationResult.getErrors();

  const guildConfig = config as IZeppelinGuildConfig;

  if (guildConfig.plugins) {
    for (const [pluginName, pluginOptions] of Object.entries(guildConfig.plugins)) {
      if (!pluginNameToPlugin.has(pluginName)) {
        return [`Unknown plugin: ${pluginName}`];
      }

      const plugin = pluginNameToPlugin.get(pluginName);
      let pluginErrors = plugin.configPreprocessor(pluginOptions as PluginOptions<any>);
      if (pluginErrors) {
        pluginErrors = pluginErrors.map(err => `${pluginName}: ${err}`);
        return pluginErrors;
      }
    }
  }

  return null;
}
