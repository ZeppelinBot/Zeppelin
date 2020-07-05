import express from "express";
import { guildPlugins } from "../plugins/availablePlugins";
import { notFound } from "./responses";
import { indentLines } from "../utils";
import { getPluginName } from "knub/dist/plugins/pluginUtils";

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
  const docsPlugins = guildPlugins.filter(pluginClass => pluginClass.showInDocs);

  app.get("/docs/plugins", (req: express.Request, res: express.Response) => {
    res.json(
      docsPlugins.map(pluginClass => {
        const thinInfo = pluginClass.info ? { prettyName: pluginClass.info.prettyName } : {};
        return {
          name: pluginClass.info,
          info: thinInfo,
        };
      }),
    );
  });

  app.get("/docs/plugins/:pluginName", (req: express.Request, res: express.Response) => {
    const plugin = docsPlugins.find(obj => getPluginName(obj) === req.params.pluginName);
    if (!plugin) {
      return notFound(res);
    }

    const name = getPluginName(plugin);
    const info = plugin.info || {};

    const commands = plugin.commands.map(cmd => ({
      trigger: cmd.trigger,
      signature: cmd.signature,
      config: cmd.config,
    }));

    const defaultOptions = plugin.defaultOptions;
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
