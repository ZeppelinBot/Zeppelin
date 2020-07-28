import { logsEvent } from "../types";
import { stripObjectToScalars } from "src/utils";
import { LogType } from "src/data/LogType";

export const LogsChannelCreateEvt = logsEvent({
  event: "channelCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.CHANNEL_CREATE, {
      channel: stripObjectToScalars(meta.args.channel),
    });
  },
});

export const LogsChannelDeleteEvt = logsEvent({
  event: "channelDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.CHANNEL_DELETE, {
      channel: stripObjectToScalars(meta.args.channel),
    });
  },
});
