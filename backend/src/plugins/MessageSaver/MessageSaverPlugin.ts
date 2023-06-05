import { PluginOptions } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { SaveMessagesToDBCmd } from "./commands/SaveMessagesToDB";
import { SavePinsToDBCmd } from "./commands/SavePinsToDB";
import { MessageCreateEvt, MessageDeleteBulkEvt, MessageDeleteEvt, MessageUpdateEvt } from "./events/SaveMessagesEvts";
import { ConfigSchema, MessageSaverPluginType } from "./types";

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

  configParser: makeIoTsConfigParser(ConfigSchema),
  defaultOptions,

  // prettier-ignore
  messageCommands: [
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
