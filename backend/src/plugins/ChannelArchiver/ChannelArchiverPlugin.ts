import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { ChannelArchiverPluginType } from "./types";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd";
import * as t from "io-ts";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";

export const ChannelArchiverPlugin = zeppelinPlugin<ChannelArchiverPluginType>()("channel_archiver", {
  showInDocs: false,

  dependencies: [TimeAndDatePlugin],
  configSchema: t.type({}),

  // prettier-ignore
  commands: [
      ArchiveChannelCmd,
  ],

  onLoad(pluginData) {
    const { state, guild } = pluginData;
  },
});
