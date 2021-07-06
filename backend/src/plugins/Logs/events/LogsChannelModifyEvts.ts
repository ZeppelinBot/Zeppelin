import { channelToConfigAccessibleChannel } from "../../../utils/configAccessibleObjects";
import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import { logsEvt } from "../types";

export const LogsChannelCreateEvt = logsEvt({
  event: "channelCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.CHANNEL_CREATE, {
      channel: channelToConfigAccessibleChannel(meta.args.channel),
    });
  },
});

export const LogsChannelDeleteEvt = logsEvt({
  event: "channelDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.CHANNEL_DELETE, {
      channel: channelToConfigAccessibleChannel(meta.args.channel),
    });
  },
});

export const LogsChannelUpdateEvt = logsEvt({
  event: "channelUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldChannel, meta.args.newChannel);
    const differenceString = differenceToString(diff);

    meta.pluginData.state.guildLogs.log(
      LogType.CHANNEL_UPDATE,
      {
        oldChannel: channelToConfigAccessibleChannel(meta.args.oldChannel),
        newChannel: channelToConfigAccessibleChannel(meta.args.newChannel),
        differenceString,
      },
      meta.args.newChannel.id,
    );
  },
});
