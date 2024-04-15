import { guildPlugin } from "knub";
import z from "zod";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { ArchiveChannelCmd } from "./commands/ArchiveChannelCmd";
import { ChannelArchiverPluginType } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

export const ChannelArchiverPlugin = guildPlugin<ChannelArchiverPluginType>()({
  name: "channel_archiver",

  dependencies: () => [TimeAndDatePlugin],
  configParser: (input) => z.strictObject({}).parse(input),

  // prettier-ignore
  messageCommands: [
      ArchiveChannelCmd,
  ],

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  }
});
