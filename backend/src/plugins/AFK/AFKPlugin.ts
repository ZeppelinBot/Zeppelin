import { PluginOptions } from "knub";
import { AFKPluginType, ConfigSchema } from "./types";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { AFK } from "src/data/AFK";

import { AfkSetCmd } from "./commands/AFKCmd";
import { AFKNotificationEvt } from "./events/AFKNotificationEvt";

const defaultOptions: PluginOptions<AFKPluginType> = {
  config: {
    can_afk: false,
    allow_links: false,
    allow_invites: false,
  },
  overrides: [
    {
      level: ">=50",
      config: {
        can_afk: true,
        allow_links: true,
        allow_invites: true,
      },
    },
  ],
};

export const AFKPlugin = zeppelinGuildPlugin<AFKPluginType>()("afk", {
  showInDocs: true,
  info: {
    prettyName: "AFK",
    description: "Allows you to set your AFK Status.",
  },

  configSchema: ConfigSchema,
  defaultOptions,

  commands: [AfkSetCmd],
  events: [AFKNotificationEvt],

  onLoad(pluginData) {
    const { state } = pluginData;

    state.afkUsers = new AFK();
  },
});
