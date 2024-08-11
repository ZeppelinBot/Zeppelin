import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { availableGuildPlugins } from "./plugins/availablePlugins.js";
import { zZeppelinGuildConfig } from "./types.js";

const pluginSchemaMap = availableGuildPlugins.reduce((map, pluginInfo) => {
  map[pluginInfo.plugin.name] = pluginInfo.docs.configSchema;
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
