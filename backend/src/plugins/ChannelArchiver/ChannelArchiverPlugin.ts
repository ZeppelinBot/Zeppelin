import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ChannelArchiverPluginType } from "./types";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd";
import * as t from "io-ts";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";

export const ChannelArchiverPlugin = zeppelinGuildPlugin<ChannelArchiverPluginType>()({
  name: "channel_archiver",
  showInDocs: false,

  dependencies: [TimeAndDatePlugin],
  configSchema: t.type({}),

  // prettier-ignore
  commands: [
      ArchiveChannelCmd,
  ]
});
