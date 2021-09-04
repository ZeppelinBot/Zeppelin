import { PluginOptions } from "knub";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { SaveMessagesToDBCmd } from "./commands/SaveMessagesToDB";
import { SavePinsToDBCmd } from "./commands/SavePinsToDB";
import { MessageCreateEvt, MessageDeleteBulkEvt, MessageDeleteEvt, MessageUpdateEvt } from "./events/SaveMessagesEvts";
import { ConfigSchema, MessageSaverPluginType } from "./types";
import { Queue } from "../../Queue";

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

let debugId = 0;
const debugGuilds = ["877581055920603238", "348468156597010432", "134286179121102848"];

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
    state.debugId = ++debugId;

    if (debugGuilds.includes(pluginData.guild.id)) {
      console.log(`[!! DEBUG !!] MessageSaverPlugin::beforeLoad (${state.debugId}): ${pluginData.guild.id}`);
    }
  },

  beforeUnload(pluginData) {
    if (debugGuilds.includes(pluginData.guild.id)) {
      console.log(
        `[!! DEBUG !!] MessageSaverPlugin::beforeUnload (${pluginData.state.debugId}): ${pluginData.guild.id}`,
      );
    }
  },
});
