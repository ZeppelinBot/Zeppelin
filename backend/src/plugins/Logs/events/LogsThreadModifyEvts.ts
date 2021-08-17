import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { logsEvt } from "../types";
import { logThreadCreate } from "../logFunctions/logThreadCreate";
import { logThreadDelete } from "../logFunctions/logThreadDelete";
import { logThreadUpdate } from "../logFunctions/logThreadUpdate";

export const LogsThreadCreateEvt = logsEvt({
  event: "threadCreate",

  async listener(meta) {
    logThreadCreate(meta.pluginData, {
      thread: meta.args.thread,
    });
  },
});

export const LogsThreadDeleteEvt = logsEvt({
  event: "threadDelete",

  async listener(meta) {
    logThreadDelete(meta.pluginData, {
      thread: meta.args.thread,
    });
  },
});

export const LogsThreadUpdateEvt = logsEvt({
  event: "threadUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldThread, meta.args.newThread, ["messageCount", "archiveTimestamp"]);
    const differenceString = differenceToString(diff);

    logThreadUpdate(meta.pluginData, {
      oldThread: meta.args.oldThread,
      newThread: meta.args.newThread,
      differenceString,
    });
  },
});
