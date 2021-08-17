import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { logsEvt } from "../types";
import { logChannelCreate } from "../logFunctions/logChannelCreate";
import { logChannelDelete } from "../logFunctions/logChannelDelete";
import { logChannelUpdate } from "../logFunctions/logChannelUpdate";

export const LogsChannelCreateEvt = logsEvt({
  event: "channelCreate",

  async listener(meta) {
    logChannelCreate(meta.pluginData, {
      channel: meta.args.channel,
    });
  },
});

export const LogsChannelDeleteEvt = logsEvt({
  event: "channelDelete",

  async listener(meta) {
    logChannelDelete(meta.pluginData, {
      channel: meta.args.channel,
    });
  },
});

export const LogsChannelUpdateEvt = logsEvt({
  event: "channelUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldChannel, meta.args.newChannel);
    const differenceString = differenceToString(diff);

    logChannelUpdate(meta.pluginData, {
      oldChannel: meta.args.oldChannel,
      newChannel: meta.args.newChannel,
      differenceString,
    });
  },
});
