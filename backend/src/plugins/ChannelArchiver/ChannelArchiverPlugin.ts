import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { ChannelArchiverPluginType } from "./types";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd";
import * as t from "io-ts";

export const ChannelArchiverPlugin = zeppelinPlugin<ChannelArchiverPluginType>()("channel_archiver", {
  showInDocs: false,
  configSchema: t.type({}),

  // prettier-ignore
  commands: [
      ArchiveChannelCmd,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;
  },
});
