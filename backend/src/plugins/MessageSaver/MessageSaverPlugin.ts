import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ConfigSchema, MessageSaverPluginType } from "./types";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { PluginOptions } from "knub";
import { MessageCreateEvt, MessageDeleteBulkEvt, MessageDeleteEvt, MessageUpdateEvt } from "./events/SaveMessagesEvts";
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

export const MessageSaverPlugin = zeppelinGuildPlugin<MessageSaverPluginType>()({
  name: "message_saver",
  showInDocs: false,

  configSchema: ConfigSchema,
  defaultOptions,

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

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
  },
});
