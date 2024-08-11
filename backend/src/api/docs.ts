import express from "express";
import z from "zod";
import { availableGuildPlugins } from "../plugins/availablePlugins.js";
import { ZeppelinGuildPluginInfo } from "../types.js";
import { indentLines } from "../utils.js";
import { notFound } from "./responses.js";

function isZodObject(schema: z.ZodTypeAny): schema is z.ZodObject<any> {
  return schema._def.typeName === "ZodObject";
}

function isZodRecord(schema: z.ZodTypeAny): schema is z.ZodRecord<any> {
  return schema._def.typeName === "ZodRecord";
}

function isZodEffects(schema: z.ZodTypeAny): schema is z.ZodEffects<any, any> {
  return schema._def.typeName === "ZodEffects";
}

function isZodOptional(schema: z.ZodTypeAny): schema is z.ZodOptional<any> {
  return schema._def.typeName === "ZodOptional";
}

function isZodArray(schema: z.ZodTypeAny): schema is z.ZodArray<any> {
  return schema._def.typeName === "ZodArray";
}

function isZodUnion(schema: z.ZodTypeAny): schema is z.ZodUnion<any> {
  return schema._def.typeName === "ZodUnion";
}

function isZodNullable(schema: z.ZodTypeAny): schema is z.ZodNullable<any> {
  return schema._def.typeName === "ZodNullable";
}

function isZodDefault(schema: z.ZodTypeAny): schema is z.ZodDefault<any> {
  return schema._def.typeName === "ZodDefault";
}

function isZodLiteral(schema: z.ZodTypeAny): schema is z.ZodLiteral<any> {
  return schema._def.typeName === "ZodLiteral";
}

function isZodIntersection(schema: z.ZodTypeAny): schema is z.ZodIntersection<any, any> {
  return schema._def.typeName === "ZodIntersection";
}

function formatZodConfigSchema(schema: z.ZodTypeAny) {
  if (isZodObject(schema)) {
    return (
      `{\n` +
      Object.entries(schema._def.shape())
        .map(([k, value]) => indentLines(`${k}: ${formatZodConfigSchema(value as z.ZodTypeAny)}`, 2))
        .join("\n") +
      "\n}"
    );
  }
  if (isZodRecord(schema)) {
    return "{\n" + indentLines(`[string]: ${formatZodConfigSchema(schema._def.valueType)}`, 2) + "\n}";
  }
  if (isZodEffects(schema)) {
    return formatZodConfigSchema(schema._def.schema);
  }
  if (isZodOptional(schema)) {
    return `Optional<${formatZodConfigSchema(schema._def.innerType)}>`;
  }
  if (isZodArray(schema)) {
    return `Array<${formatZodConfigSchema(schema._def.type)}>`;
  }
  if (isZodUnion(schema)) {
    return schema._def.options.map((t) => formatZodConfigSchema(t)).join(" | ");
  }
  if (isZodNullable(schema)) {
    return `Nullable<${formatZodConfigSchema(schema._def.innerType)}>`;
  }
  if (isZodDefault(schema)) {
    return formatZodConfigSchema(schema._def.innerType);
  }
  if (isZodLiteral(schema)) {
    return schema._def.value;
  }
  if (isZodIntersection(schema)) {
    return [formatZodConfigSchema(schema._def.left), formatZodConfigSchema(schema._def.right)].join(" & ");
  }
  if (schema._def.typeName === "ZodString") {
    return "string";
  }
  if (schema._def.typeName === "ZodNumber") {
    return "number";
  }
  if (schema._def.typeName === "ZodBoolean") {
    return "boolean";
  }
  if (schema._def.typeName === "ZodNever") {
    return "never";
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

    const defaultOptions = pluginInfo.plugin.defaultOptions || {};

    res.json({
      name: pluginInfo.plugin.name,
      info,
      configSchema: formattedConfigSchema,
      defaultOptions,
      messageCommands,
    });
  });
}
