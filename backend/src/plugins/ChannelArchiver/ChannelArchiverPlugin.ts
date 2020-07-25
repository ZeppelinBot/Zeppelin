import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { ChannelArchiverPluginType } from "./types";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd";

export const ChannelArchiverPlugin = zeppelinPlugin<ChannelArchiverPluginType>()("channel_archiver", {
  showInDocs: false,

  // prettier-ignore
  commands: [
      ArchiveChannelCmd,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;
  },
});
