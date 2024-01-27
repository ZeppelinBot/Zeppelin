import express from "express";
import z from "zod";
import { guildPlugins } from "../plugins/availablePlugins";
import { indentLines } from "../utils";
import { notFound } from "./responses";

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

export function initDocs(app: express.Express) {
  const docsPlugins = guildPlugins.filter((plugin) => plugin.showInDocs);

  app.get("/docs/plugins", (req: express.Request, res: express.Response) => {
    res.json(
      docsPlugins.map((plugin) => {
        const thinInfo = plugin.info ? { prettyName: plugin.info.prettyName, legacy: plugin.info.legacy ?? false } : {};
        return {
          name: plugin.name,
          info: thinInfo,
        };
      }),
    );
  });

  app.get("/docs/plugins/:pluginName", (req: express.Request, res: express.Response) => {
    // prettier-ignore
    const plugin = docsPlugins.find(_plugin => _plugin.name === req.params.pluginName);
    if (!plugin) {
      return notFound(res);
    }

    const name = plugin.name;
    const info = { ...(plugin.info || {}) };
    delete info.configSchema;

    const messageCommands = (plugin.messageCommands || []).map((cmd) => ({
      trigger: cmd.trigger,
      permission: cmd.permission,
      signature: cmd.signature,
      description: cmd.description,
      usage: cmd.usage,
      config: cmd.config,
    }));

    const defaultOptions = plugin.defaultOptions || {};
    const configSchema = plugin.info?.configSchema && formatZodConfigSchema(plugin.info.configSchema);

    res.json({
      name,
      info,
      configSchema,
      defaultOptions,
      messageCommands,
    });
  });
}
