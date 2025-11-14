import { guildPlugin } from "vety";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd.js";
import { ChannelArchiverPluginType, zChannelArchiverPluginConfig } from "./types.js";

export const ChannelArchiverPlugin = guildPlugin<ChannelArchiverPluginType>()({
  name: "channel_archiver",

  dependencies: () => [TimeAndDatePlugin],
  configSchema: zChannelArchiverPluginConfig,

  // prettier-ignore
  messageCommands: [
      ArchiveChannelCmd,
  ],

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },
});
