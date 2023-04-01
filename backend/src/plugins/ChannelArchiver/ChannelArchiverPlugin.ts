import * as t from "io-ts";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd";
import { ChannelArchiverPluginType } from "./types";

const ConfigSchema = t.type({});

export const ChannelArchiverPlugin = zeppelinGuildPlugin<ChannelArchiverPluginType>()({
  name: "channel_archiver",
  showInDocs: false,

  dependencies: () => [TimeAndDatePlugin],
  configParser: makeIoTsConfigParser(ConfigSchema),

  // prettier-ignore
  messageCommands: [
      ArchiveChannelCmd,
  ],
});
