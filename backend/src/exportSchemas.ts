import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { guildPluginInfo } from "./plugins/pluginInfo.js";
import { zZeppelinGuildConfig } from "./types.js";

const pluginSchemaMap = Object.entries(guildPluginInfo).reduce((map, [pluginName, pluginInfo]) => {
  if (pluginInfo.configSchema) {
    map[pluginName] = pluginInfo.configSchema;
  }
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
