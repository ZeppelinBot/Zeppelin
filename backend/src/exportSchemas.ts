import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { guildPlugins } from "./plugins/availablePlugins";
import { zZeppelinGuildConfig } from "./types";

const pluginSchemaMap = guildPlugins.reduce((map, plugin) => {
  if (!plugin.info) {
    return map;
  }
  map[plugin.name] = plugin.info.configSchema;
  return map;
}, {});

const fullSchema = zZeppelinGuildConfig.omit({ plugins: true }).merge(
  z.strictObject({
    plugins: z.strictObject(pluginSchemaMap).partial(),
  }),
);

const jsonSchema = zodToJsonSchema(fullSchema);

console.log(JSON.stringify(jsonSchema, null, 2));

process.exit(0);
