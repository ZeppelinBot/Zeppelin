import { BaseConfig, ConfigValidationError, PluginConfigManager } from "knub";
import { ZodError } from "zod";
import { ZeppelinPlugin } from "./plugins/ZeppelinPlugin";
import { guildPlugins } from "./plugins/availablePlugins";
import { zZeppelinGuildConfig } from "./types";
import { formatZodIssue } from "./utils/formatZodIssue";

const pluginNameToPlugin = new Map<string, ZeppelinPlugin>();
for (const plugin of guildPlugins) {
  pluginNameToPlugin.set(plugin.name, plugin);
}

export async function validateGuildConfig(config: any): Promise<string | null> {
  const validationResult = zZeppelinGuildConfig.safeParse(config);
  if (!validationResult.success) {
    return validationResult.error.issues.map(formatZodIssue).join("\n");
  }

  const guildConfig = config as BaseConfig;

  if (guildConfig.plugins) {
    for (const [pluginName, pluginOptions] of Object.entries(guildConfig.plugins)) {
      if (!pluginNameToPlugin.has(pluginName)) {
        return `Unknown plugin: ${pluginName}`;
      }

      if (typeof pluginOptions !== "object" || pluginOptions == null) {
        return `Invalid options specified for plugin ${pluginName}`;
      }

      const plugin = pluginNameToPlugin.get(pluginName)!;
      const configManager = new PluginConfigManager(plugin.defaultOptions || { config: {} }, pluginOptions, {
        levels: {},
        parser: plugin.configParser,
      });
      try {
        await configManager.init();
      } catch (err) {
        if (err instanceof ZodError) {
          return `${pluginName}: ${err.issues.map(formatZodIssue).join("\n")}`;
        }
        if (err instanceof ConfigValidationError) {
          return `${pluginName}: ${err.message}`;
        }

        throw err;
      }
    }
  }

  return null;
}
