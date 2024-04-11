import { PluginOptions, guildPlugin } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { SaveMessagesToDBCmd } from "./commands/SaveMessagesToDB";
import { SavePinsToDBCmd } from "./commands/SavePinsToDB";
import { MessageCreateEvt, MessageDeleteBulkEvt, MessageDeleteEvt, MessageUpdateEvt } from "./events/SaveMessagesEvts";
import { MessageSaverPluginType, zMessageSaverConfig } from "./types";

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

export const MessageSaverPlugin = guildPlugin<MessageSaverPluginType>()({
  name: "message_saver",

  configParser: (input) => zMessageSaverConfig.parse(input),
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
