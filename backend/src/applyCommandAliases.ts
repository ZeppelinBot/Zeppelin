import { PluginMessageCommandManager } from "knub";

type RawAliasValue = string | string[];
type GuildAliasConfig = Record<string, Record<string, RawAliasValue>>;

type PluginDataWithAliases = {
  context?: string;
  pluginName?: string;
  fullConfig?: {
    aliases?: GuildAliasConfig;
  };
};

const originalAdd = PluginMessageCommandManager.prototype.add;

function normalizeAliasValue(value: RawAliasValue): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((alias) => alias.trim())
    .filter((alias) => alias.length > 0);
}

PluginMessageCommandManager.prototype.add = function addWithCommandAliases(
  this: PluginMessageCommandManager<any>,
  blueprint: any,
) {
  const pluginData = (this as unknown as { pluginData?: PluginDataWithAliases }).pluginData;
  if (pluginData?.context === "guild") {
    const aliasesByPlugin = pluginData.fullConfig?.aliases;
    if (aliasesByPlugin) {
      const pluginName = pluginData.pluginName ?? "";
      const pluginAliases =
        aliasesByPlugin[pluginName] ?? aliasesByPlugin[pluginName.toLowerCase()];

      if (pluginAliases) {
        const normalizedAliasMap = new Map<string, string[]>();
        for (const [rawKey, rawValue] of Object.entries(pluginAliases)) {
          const normalizedKey = rawKey.trim().toLowerCase();
          if (!normalizedKey) {
            continue;
          }

          const normalizedValues = normalizeAliasValue(rawValue);
          if (normalizedValues.length === 0) {
            continue;
          }

          normalizedAliasMap.set(normalizedKey, normalizedValues);
        }

        if (normalizedAliasMap.size > 0 && blueprint?.trigger) {
          const baseTriggers = Array.isArray(blueprint.trigger)
            ? [...blueprint.trigger]
            : [blueprint.trigger];
          const updatedTriggers = [...baseTriggers];

          const existingStringTriggers = new Set(
            baseTriggers
              .filter((trigger): trigger is string => typeof trigger === "string")
              .map((trigger) => trigger.trim().toLowerCase()),
          );

          let changed = false;
          for (const trigger of baseTriggers) {
            if (typeof trigger !== "string") {
              continue;
            }

            const triggerKey = trigger.trim().toLowerCase();
            const aliasList = normalizedAliasMap.get(triggerKey);
            if (!aliasList) {
              continue;
            }

            for (const alias of aliasList) {
              const aliasKey = alias.toLowerCase();
              if (existingStringTriggers.has(aliasKey)) {
                continue;
              }

              existingStringTriggers.add(aliasKey);
              updatedTriggers.push(alias);
              changed = true;
            }
          }

          if (changed) {
            blueprint = {
              ...blueprint,
              trigger: updatedTriggers,
            };
          }
        }
      }
    }
  }

  return originalAdd.call(this, blueprint);
};
