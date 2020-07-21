import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, MessageSaverPluginType } from "./types";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { PluginOptions } from "knub";
import { MessageCreateEvt, MessageUpdateEvt, MessageDeleteEvt, MessageDeleteBulkEvt } from "./events/SaveMessagesEvts";
import { SaveMessagesToDBCmd } from "./commands/SaveMessagesToDB";
import { SavePinsToDBCmd } from "./commands/SavePinsToDB";

const defaultOptions: PluginOptions<MessageSaverPluginType> = {
  config: {
    can_manage: false,
  },
  overrides: [
    {
      level: ">=100",
      config: {
        can_manage: true,
      },
    },
  ],
};

export const MessageSaverPlugin = zeppelinPlugin<MessageSaverPluginType>()("message_saver", {
  configSchema: ConfigSchema,
  defaultOptions,

  showInDocs: false,

  // prettier-ignore
  commands: [
    SaveMessagesToDBCmd,
    SavePinsToDBCmd,
  ],

  // prettier-ignore
  events: [
    MessageCreateEvt,
    MessageUpdateEvt,
    MessageDeleteEvt,
    MessageDeleteBulkEvt,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
  },
});
