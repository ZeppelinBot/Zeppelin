import { ConfigValidationError, GuildPluginBlueprint, PluginConfigManager } from "knub";
import moment from "moment-timezone";
import { ZodError } from "zod";
import { ZeppelinGuildConfig, zZeppelinGuildConfig } from "./types.js";
import { formatZodIssue } from "./utils/formatZodIssue.js";
import { availableGuildPlugins } from "./plugins/availablePlugins.js";

const pluginNameToPlugin = new Map<string, GuildPluginBlueprint<any, any>>();
for (const pluginInfo of availableGuildPlugins) {
  pluginNameToPlugin.set(pluginInfo.plugin.name, pluginInfo.plugin);
}

export async function validateGuildConfig(config: any): Promise<string | null> {
  const validationResult = zZeppelinGuildConfig.safeParse(config);
  if (!validationResult.success) {
    return validationResult.error.issues.map(formatZodIssue).join("\n");
  }

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
