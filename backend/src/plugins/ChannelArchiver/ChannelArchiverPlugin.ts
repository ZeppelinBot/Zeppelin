import { guildPlugin } from "knub";
import z from "zod";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin.js";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd.js";
import { ChannelArchiverPluginType } from "./types.js";

export const ChannelArchiverPlugin = guildPlugin<ChannelArchiverPluginType>()({
  name: "channel_archiver",

  dependencies: () => [TimeAndDatePlugin],
  configParser: (input) => z.strictObject({}).parse(input),

  // prettier-ignore
  messageCommands: [
      ArchiveChannelCmd,
  ],
});
