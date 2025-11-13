import { BaseConfig, ConfigValidationError, GuildPluginBlueprint, PluginConfigManager } from "vety";
import { z, ZodError } from "zod";
import { availableGuildPlugins } from "./plugins/availablePlugins.js";
import { zZeppelinGuildConfig } from "./types.js";
import { formatZodIssue } from "./utils/formatZodIssue.js";

const pluginNameToPlugin = new Map<string, GuildPluginBlueprint<any, any>>();
for (const pluginInfo of availableGuildPlugins) {
  pluginNameToPlugin.set(pluginInfo.plugin.name, pluginInfo.plugin);
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
      const configManager = new PluginConfigManager(pluginOptions, {
        configSchema: plugin.configSchema,
        defaultOverrides: plugin.defaultOverrides ?? [],
        levels: {},
        customOverrideCriteriaFunctions: plugin.customOverrideCriteriaFunctions,
      });

      try {
        await configManager.init();
      } catch (err) {
        if (err instanceof ZodError) {
          return `${pluginName}:\n${z.prettifyError(err)}`;
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
