import { PluginOptions } from "knub";
import { StrictValidationError } from "src/validatorUtils";
import { ConfigPreprocessorFn } from "knub/dist/config/configTypes";
import { GuildContextMenuLinks } from "../../data/GuildContextMenuLinks";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { MutesPlugin } from "../Mutes/MutesPlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { availableTypes } from "./actions/availableActions";
import { ContextClickedEvt } from "./events/ContextClickedEvt";
import { ConfigSchema, ContextMenuPluginType } from "./types";
import { loadAllCommands } from "./utils/loadAllCommands";

const defaultOptions: PluginOptions<ContextMenuPluginType> = {
  config: {
    context_actions: {},
  },
};

const configPreprocessor: ConfigPreprocessorFn<ContextMenuPluginType> = options => {
  if (options.config.context_actions) {
    for (const [name, contextMenu] of Object.entries(options.config.context_actions)) {
      if (Object.entries(contextMenu.action).length !== 1) {
        throw new StrictValidationError([`Invalid value for context_actions/${name}: Must have exactly one action.`]);
      }

      const actionName = Object.entries(contextMenu.action)[0][0];
      if (!availableTypes[actionName].includes(contextMenu.type)) {
        throw new StrictValidationError([
          `Invalid value for context_actions/${name}/${actionName}: ${actionName} is not allowed on type ${contextMenu.type}.`,
        ]);
      }
    }
  }

  return options;
};

export const ContextMenuPlugin = zeppelinGuildPlugin<ContextMenuPluginType>()({
  name: "context_menu",

  configSchema: ConfigSchema,
  defaultOptions,
  configPreprocessor,

  // prettier-ignore
  events: [
    ContextClickedEvt,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.contextMenuLinks = new GuildContextMenuLinks(guild.id);
  },

  afterLoad(pluginData) {
    loadAllCommands(pluginData);
  },

  dependencies: [MutesPlugin, LogsPlugin],
});
