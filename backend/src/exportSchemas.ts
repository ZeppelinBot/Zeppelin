import fs from "node:fs";
import { z } from "zod";
import { availableGuildPlugins } from "./plugins/availablePlugins.js";
import { zZeppelinGuildConfig } from "./types.js";
import { JSONSchema } from "zod/v4/core";
import { makeJsonSchemaDeepPartial } from "./utils/makeJsonSchemaDeepPartial.js";

const basePluginOverrideCriteriaSchema = z.strictObject({
  channel: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  category: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  level: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  user: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  role: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  thread: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  is_thread: z.boolean().nullable().optional(),
  thread_type: z.literal(["public", "private"]).nullable().optional(),
  extra: z.any().optional(),
});

const pluginOverrideCriteriaSchema = basePluginOverrideCriteriaSchema
  .extend({
    get zzz_dummy_property_do_not_use() {
      return pluginOverrideCriteriaSchema.optional();
    },
    get all() {
      return z.array(pluginOverrideCriteriaSchema).optional();
    },
    get any() {
      return z.array(pluginOverrideCriteriaSchema).optional();
    },
    get not() {
      return pluginOverrideCriteriaSchema.optional();
    },
  })
  .meta({
    id: "overrideCriteria",
  });

const outputPath = process.argv[2];
if (!outputPath) {
  console.error("Output path required");
  process.exit(1);
}

function overrides(configSchema: z.ZodType): z.ZodType {
  return pluginOverrideCriteriaSchema.extend({
    config: configSchema,
  });
}

const pluginSchemaMap = availableGuildPlugins.reduce((map, pluginInfo) => {
  map[pluginInfo.plugin.name] = z.object({
    config: pluginInfo.docs.configSchema.optional(),
    overrides: z.array(overrides(pluginInfo.docs.configSchema)).optional(),
  });
  return map;
}, {});

const fullSchema = zZeppelinGuildConfig.omit({ plugins: true }).extend({
  plugins: z.strictObject(pluginSchemaMap).partial().optional(),
});

const jsonSchema = z.toJSONSchema(fullSchema, { io: "input", cycles: "ref" });

// Turn overrides deep partial
const pluginsSchema = jsonSchema.properties!.plugins as JSONSchema.JSONSchema;
for (const pluginName of Object.keys(pluginsSchema.properties!)) {
  const pluginSchema = pluginsSchema.properties![pluginName] as JSONSchema.JSONSchema;
  const overridesSchema = pluginSchema.properties!.overrides! as JSONSchema.JSONSchema;
  const overrideItemSchema = overridesSchema.items! as JSONSchema.JSONSchema;
  makeJsonSchemaDeepPartial(overrideItemSchema.properties!.config as JSONSchema.JSONSchema);
}

fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2), { encoding: "utf8" });

process.exit(0);
