import z from "zod";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd";
import { ChannelArchiverPluginType } from "./types";

export const ChannelArchiverPlugin = zeppelinGuildPlugin<ChannelArchiverPluginType>()({
  name: "channel_archiver",
  showInDocs: false,

  dependencies: () => [TimeAndDatePlugin],
  configParser: (input) => z.strictObject({}).parse(input),

  // prettier-ignore
  messageCommands: [
      ArchiveChannelCmd,
  ],
});
