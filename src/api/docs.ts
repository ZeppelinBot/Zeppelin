import express from "express";
import { availablePlugins } from "../plugins/availablePlugins";
import { ZeppelinPlugin } from "../plugins/ZeppelinPlugin";
import { notFound } from "./responses";
import { CommandManager, ICommandConfig } from "knub/dist/CommandManager";

const commandManager = new CommandManager();

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
      const propCommands = Reflect.getMetadata("commands", pluginClass.prototype, prop);
      if (propCommands) {
        arr.push(
          ...propCommands.map(cmd => {
            const trigger = typeof cmd.command === "string" ? cmd.command : cmd.command.source;
            const parameters = cmd.parameters
              ? typeof cmd.parameters === "string"
                ? commandManager.parseParameterString(cmd.parameters)
                : cmd.parameters
              : [];
            const config: ICommandConfig = cmd.options || {};
            if (config.overloads) {
              config.overloads = config.overloads.map(overload => {
                return typeof overload === "string" ? commandManager.parseParameterString(overload) : overload;
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

    res.json({
      name: pluginClass.pluginName,
      info: pluginClass.pluginInfo || {},
      options,
      commands,
    });
  });
}
