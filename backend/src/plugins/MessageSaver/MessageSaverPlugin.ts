import { guildPlugin } from "vety";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { SaveMessagesToDBCmd } from "./commands/SaveMessagesToDB.js";
import { SavePinsToDBCmd } from "./commands/SavePinsToDB.js";
import {
  MessageCreateEvt,
  MessageDeleteBulkEvt,
  MessageDeleteEvt,
  MessageUpdateEvt,
} from "./events/SaveMessagesEvts.js";
import { MessageSaverPluginType, zMessageSaverConfig } from "./types.js";

export const MessageSaverPlugin = guildPlugin<MessageSaverPluginType>()({
  name: "message_saver",

  configSchema: zMessageSaverConfig,
  defaultOverrides: [
    {
      level: ">=100",
      config: {
        can_manage: true,
      },
    },
  ],

  // prettier-ignore
  messageCommands: [
    SaveMessagesToDBCmd,
    SavePinsToDBCmd,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);

    // Register manually so message saving also runs when loaded only as a dependency.
    pluginData.events.registerEventListener(MessageCreateEvt);
    pluginData.events.registerEventListener(MessageUpdateEvt);
    pluginData.events.registerEventListener(MessageDeleteEvt);
    pluginData.events.registerEventListener(MessageDeleteBulkEvt);
  },
});
