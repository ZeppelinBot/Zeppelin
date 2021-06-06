import express from "express";
import { guildPlugins } from "../plugins/availablePlugins";
import { indentLines } from "../utils";
import { notFound } from "./responses";

function formatConfigSchema(schema) {
  if (schema._tag === "InterfaceType" || schema._tag === "PartialType") {
    return (
      `{\n` +
      Object.entries(schema.props)
        .map(([k, value]) => indentLines(`${k}: ${formatConfigSchema(value)}`, 2))
        .join("\n") +
      "\n}"
    );
  } else if (schema._tag === "DictionaryType") {
    return "{\n" + indentLines(`[string]: ${formatConfigSchema(schema.codomain)}`, 2) + "\n}";
  } else if (schema._tag === "ArrayType") {
    return `Array<${formatConfigSchema(schema.type)}>`;
  } else if (schema._tag === "UnionType") {
    if (schema.name.startsWith("Nullable<")) {
      return `Nullable<${formatConfigSchema(schema.types[0])}>`;
    } else if (schema.name.startsWith("Optional<")) {
      return `Optional<${formatConfigSchema(schema.types[0])}>`;
    } else {
      return schema.types.map(t => formatConfigSchema(t)).join(" | ");
    }
  } else if (schema._tag === "IntersectionType") {
    return schema.types.map(t => formatConfigSchema(t)).join(" & ");
  } else {
    return schema.name;
  }
}

export function initDocs(app: express.Express) {
  const docsPlugins = guildPlugins.filter(plugin => plugin.showInDocs);

  app.get("/docs/plugins", (req: express.Request, res: express.Response) => {
    res.json(
      docsPlugins.map(plugin => {
        const thinInfo = plugin.info ? { prettyName: plugin.info.prettyName } : {};
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
    const info = plugin.info || {};

    const commands = (plugin.commands || []).map(cmd => ({
      trigger: cmd.trigger,
      permission: cmd.permission,
      signature: cmd.signature,
      description: cmd.description,
      usage: cmd.usage,
      config: cmd.config,
    }));

    const defaultOptions = plugin.defaultOptions || {};
    const configSchema = plugin.configSchema && formatConfigSchema(plugin.configSchema);

    res.json({
      name,
      info,
      configSchema,
      defaultOptions,
      commands,
    });
  });
}
