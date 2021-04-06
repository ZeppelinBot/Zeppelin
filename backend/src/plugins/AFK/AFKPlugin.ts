import { PluginOptions } from "knub";
import { AFKPluginType, ConfigSchema } from './types';
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { AFK } from "src/data/AFK";

import { AfkSetCmd } from "./commands/AFKCmd";
import { AFKNotificationEvt } from "./events/AFKNotificationEvt";
import { ConfigPreprocessorFn } from "knub/dist/config/configTypes";
import { StrictValidationError } from "../../validatorUtils";

const defaultOptions: PluginOptions<AFKPluginType> = {
    config: {
        can_afk: false,
        allow_links: false,
        allow_invites: false,
        max_status_limit: 32
    },
    overrides: [
        {
            level: '>=50',
            config: {
                can_afk: true,
                allow_links: true,
                allow_invites: true,
                max_status_limit: 32,
            }
        }
    ]
}

const configPreprocessor: ConfigPreprocessorFn<AFKPluginType> = options => {
  if (options.config.max_status_limit) {
    const max_limit = options.config.max_status_limit;
    if (max_limit > 32) throw new StrictValidationError([
      `max_status_limit needs to be under 32 characters.`
    ]);
  }
  return options;
}

export const AFKPlugin = zeppelinGuildPlugin<AFKPluginType>()("afk", {
    showInDocs: true,
    info: {
        prettyName: "AFK",
        description: "Allows you to set your AFK Status.",
    },

    configSchema: ConfigSchema,
    defaultOptions,
    configPreprocessor,

    commands: [AfkSetCmd],
    events: [AFKNotificationEvt],

    onLoad(pluginData) {
        const { state } = pluginData;

        state.afkUsers = new AFK();
    }
})

