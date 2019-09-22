import express from "express";
import { availablePlugins } from "../plugins/availablePlugins";
import { ZeppelinPlugin } from "../plugins/ZeppelinPlugin";
import { notFound } from "./responses";
import { dropPropertiesByName, indentLines } from "../utils";
import { IPluginCommandConfig, Plugin, pluginUtils } from "knub";
import { parseParameters } from "knub-command-manager";

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
  } else {
    return schema.name;
  }
}

function formatTypeName(typeName) {
  let result = "";
  let indent = 0;
  let skip = false;
  for (const char of [...typeName]) {
    if (skip) {
      skip = false;
      continue;
    }

    if (char === "}") {
      result += "\n";
      indent--;
      skip = true;
    }

    result += char;

    if (char === "{") {
      result += "\n";
      indent++;
      skip = true;
    }

    if (char === ",") {
      result += "\n";
      skip = true;
    }
  }
  return result;
}

export function initDocs(app: express.Express) {
  const docsPlugins = availablePlugins.filter(pluginClass => pluginClass.showInDocs);

  app.get("/docs/plugins", (req: express.Request, res: express.Response) => {
    res.json(
      docsPlugins.map(pluginClass => {
        const thinInfo = pluginClass.pluginInfo ? { prettyName: pluginClass.pluginInfo.prettyName } : {};
        return {
          name: pluginClass.pluginName,
          info: thinInfo,
        };
      }),
    );
  });

  app.get("/docs/plugins/:pluginName", (req: express.Request, res: express.Response) => {
    const pluginClass = docsPlugins.find(obj => obj.pluginName === req.params.pluginName);
    if (!pluginClass) {
      return notFound(res);
    }

    const props = Reflect.ownKeys(pluginClass.prototype);
    const commands = props.reduce((arr, prop) => {
      if (typeof prop !== "string") return arr;
      const decoratorCommands = pluginUtils.getPluginDecoratorCommands(pluginClass as typeof Plugin);
      if (decoratorCommands) {
        arr.push(
          ...decoratorCommands.map(cmd => {
            const trigger = typeof cmd.trigger === "string" ? cmd.trigger : cmd.trigger.source;
            const parameters = cmd.parameters
              ? typeof cmd.parameters === "string"
                ? parseParameters(cmd.parameters)
                : cmd.parameters
              : [];
            const config: IPluginCommandConfig = cmd.config || {};
            if (config.overloads) {
              config.overloads = config.overloads.map(overload => {
                return typeof overload === "string" ? parseParameters(overload) : overload;
              });
            }

            return {
              trigger,
              parameters,
              config,
            };
          }),
        );
      }
      return arr;
    }, []);

    const options = (pluginClass as typeof ZeppelinPlugin).getStaticDefaultOptions();

    const configSchema = pluginClass.configSchema && formatConfigSchema(pluginClass.configSchema);

    res.json({
      name: pluginClass.pluginName,
      info: pluginClass.pluginInfo || {},
      configSchema,
      options,
      commands,
    });
  });
}
