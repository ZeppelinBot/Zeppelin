import { configUtils, ConfigValidationError, PluginOptions } from "knub";
import moment from "moment-timezone";
import { guildPlugins } from "./plugins/availablePlugins";
import { ZeppelinPlugin } from "./plugins/ZeppelinPlugin";
import { PartialZeppelinGuildConfigSchema, ZeppelinGuildConfig } from "./types";
import { decodeAndValidateStrict, StrictValidationError } from "./validatorUtils";

const pluginNameToPlugin = new Map<string, ZeppelinPlugin>();
for (const plugin of guildPlugins) {
  pluginNameToPlugin.set(plugin.name, plugin);
}

export async function validateGuildConfig(config: any): Promise<string | null> {
  const validationResult = decodeAndValidateStrict(PartialZeppelinGuildConfigSchema, config);
  if (validationResult instanceof StrictValidationError) return validationResult.getErrors();

  const guildConfig = config as ZeppelinGuildConfig;

  if (guildConfig.timezone) {
    const validTimezones = moment.tz.names();
    if (!validTimezones.includes(guildConfig.timezone)) {
      return `Invalid timezone: ${guildConfig.timezone}`;
    }
  }

  if (guildConfig.plugins) {
    for (const [pluginName, pluginOptions] of Object.entries(guildConfig.plugins)) {
      if (!pluginNameToPlugin.has(pluginName)) {
        return `Unknown plugin: ${pluginName}`;
      }

      if (typeof pluginOptions !== "object" || pluginOptions == null) {
        return `Invalid options specified for plugin ${pluginName}`;
      }

      const plugin = pluginNameToPlugin.get(pluginName)!;
      try {
        const mergedOptions = configUtils.mergeConfig(plugin.defaultOptions || {}, pluginOptions);
        await plugin.configPreprocessor?.((mergedOptions as unknown) as PluginOptions<any>, true);
      } catch (err) {
        if (err instanceof ConfigValidationError || err instanceof StrictValidationError) {
          return `${pluginName}: ${err.message}`;
        }

        throw err;
      }
    }
  }

  return null;
}
