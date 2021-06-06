import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { logsEvt } from "../types";

export const LogsChannelCreateEvt = logsEvt({
  event: "channelCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.CHANNEL_CREATE, {
      channel: stripObjectToScalars(meta.args.channel),
    });
  },
});

export const LogsChannelDeleteEvt = logsEvt({
  event: "channelDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.CHANNEL_DELETE, {
      channel: stripObjectToScalars(meta.args.channel),
    });
  },
});
