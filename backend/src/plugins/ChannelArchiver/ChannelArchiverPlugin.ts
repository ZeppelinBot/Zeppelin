import * as t from "io-ts";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd";
import { ChannelArchiverPluginType } from "./types";

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
