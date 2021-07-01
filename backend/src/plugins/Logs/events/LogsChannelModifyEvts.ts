import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference, stripObjectToScalars } from "../../../utils";
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

export const LogsChannelUpdateEvt = logsEvt({
  event: "channelUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldChannel, meta.args.newChannel);
    const differenceString = differenceToString(diff);

    meta.pluginData.state.guildLogs.log(LogType.CHANNEL_UPDATE, {
      oldChannel: stripObjectToScalars(meta.args.oldChannel),
      newChannel: stripObjectToScalars(meta.args.newChannel),
      differenceString,
    });
  },
});
