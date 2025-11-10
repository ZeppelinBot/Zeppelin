import express from "express";
import { z } from "zod";
import { $ZodPipeDef } from "zod/v4/core";
import { availableGuildPlugins } from "../plugins/availablePlugins.js";
import { ZeppelinGuildPluginInfo } from "../types.js";
import { indentLines } from "../utils.js";
import { notFound } from "./responses.js";

function isZodObject(schema: z.ZodType): schema is z.ZodObject<any> {
  return schema.def.type === "object";
}

function isZodRecord(schema: z.ZodType): schema is z.ZodRecord<any> {
  return schema.def.type === "record";
}

function isZodOptional(schema: z.ZodType): schema is z.ZodOptional<any> {
  return schema.def.type === "optional";
}

function isZodArray(schema: z.ZodType): schema is z.ZodArray<any> {
  return schema.def.type === "array";
}

function isZodUnion(schema: z.ZodType): schema is z.ZodUnion<any> {
  return schema.def.type === "union";
}

function isZodNullable(schema: z.ZodType): schema is z.ZodNullable<any> {
  return schema.def.type === "nullable";
}

function isZodDefault(schema: z.ZodType): schema is z.ZodDefault<any> {
  return schema.def.type === "default";
}

function isZodLiteral(schema: z.ZodType): schema is z.ZodLiteral<any> {
  return schema.def.type === "literal";
}

function isZodIntersection(schema: z.ZodType): schema is z.ZodIntersection<any, any> {
  return schema.def.type === "intersection";
}

function formatZodConfigSchema(schema: z.ZodType) {
  if (isZodObject(schema)) {
    return (
      `{\n` +
      Object.entries(schema.def.shape)
        .map(([k, value]) => indentLines(`${k}: ${formatZodConfigSchema(value as z.ZodType)}`, 2))
        .join("\n") +
      "\n}"
    );
  }
  if (isZodRecord(schema)) {
    return "{\n" + indentLines(`[string]: ${formatZodConfigSchema(schema.valueType as z.ZodType)}`, 2) + "\n}";
  }
  if (isZodOptional(schema)) {
    return `Optional<${formatZodConfigSchema(schema.def.innerType)}>`;
  }
  if (isZodArray(schema)) {
    return `Array<${formatZodConfigSchema(schema.def.element)}>`;
  }
  if (isZodUnion(schema)) {
    return schema.def.options.map((t) => formatZodConfigSchema(t)).join(" | ");
  }
  if (isZodNullable(schema)) {
    return `Nullable<${formatZodConfigSchema(schema.def.innerType)}>`;
  }
  if (isZodDefault(schema)) {
    return formatZodConfigSchema(schema.def.innerType);
  }
  if (isZodLiteral(schema)) {
    return schema.def.values;
  }
  if (isZodIntersection(schema)) {
    return [
      formatZodConfigSchema(schema.def.left as z.ZodType),
      formatZodConfigSchema(schema.def.right as z.ZodType),
    ].join(" & ");
  }
  if (schema.def.type === "string") {
    return "string";
  }
  if (schema.def.type === "number") {
    return "number";
  }
  if (schema.def.type === "boolean") {
    return "boolean";
  }
  if (schema.def.type === "never") {
    return "never";
  }
  if (schema.def.type === "pipe") {
    return formatZodConfigSchema((schema.def as $ZodPipeDef).in as z.ZodType);
  }
  return "unknown";
}

const availableGuildPluginsByName = availableGuildPlugins.reduce<Record<string, ZeppelinGuildPluginInfo>>(
  (map, obj) => {
    map[obj.plugin.name] = obj;
    return map;
  },
  {},
);

export function initDocs(router: express.Router) {
  const docsPlugins = availableGuildPlugins.filter((obj) => obj.docs.type !== "internal");

  router.get("/docs/plugins", (req: express.Request, res: express.Response) => {
    res.json(
      docsPlugins.map((obj) => ({
        name: obj.plugin.name,
        info: {
          prettyName: obj.docs.prettyName,
          type: obj.docs.type,
        },
      })),
    );
  });

  router.get("/docs/plugins/:pluginName", (req: express.Request, res: express.Response) => {
    const pluginInfo = availableGuildPluginsByName[req.params.pluginName];
    if (!pluginInfo) {
      return notFound(res);
    }

    const { configSchema, ...info } = pluginInfo.docs;
    const formattedConfigSchema = formatZodConfigSchema(configSchema);

    const messageCommands = (pluginInfo.plugin.messageCommands || []).map((cmd) => ({
      trigger: cmd.trigger,
      permission: cmd.permission,
      signature: cmd.signature,
      description: cmd.description,
      usage: cmd.usage,
      config: cmd.config,
    }));

    const defaultOptions = pluginInfo.docs.configSchema.safeParse({}).data ?? {};

    res.json({
      name: pluginInfo.plugin.name,
      info,
      configSchema: formattedConfigSchema,
      defaultOptions,
      messageCommands,
    });
  });
}
