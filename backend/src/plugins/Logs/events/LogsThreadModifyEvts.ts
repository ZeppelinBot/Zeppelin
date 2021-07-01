import { LogType } from "../../../data/LogType";
import { stripObjectToScalars, getScalarDifference, differenceToString } from "../../../utils";
import { logsEvt } from "../types";

export const LogsThreadCreateEvt = logsEvt({
  event: "threadCreate",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.THREAD_CREATE, {
      thread: stripObjectToScalars(meta.args.thread),
    });
  },
});

export const LogsThreadDeleteEvt = logsEvt({
  event: "threadDelete",

  async listener(meta) {
    meta.pluginData.state.guildLogs.log(LogType.THREAD_DELETE, {
      thread: stripObjectToScalars(meta.args.thread),
    });
  },
});

export const LogsThreadUpdateEvt = logsEvt({
  event: "threadUpdate",

  async listener(meta) {
    const diff = getScalarDifference(meta.args.oldThread, meta.args.newThread, ["messageCount", "archiveTimestamp"]);
    const differenceString = differenceToString(diff);

    meta.pluginData.state.guildLogs.log(LogType.THREAD_UPDATE, {
      oldThread: stripObjectToScalars(meta.args.oldThread),
      newThread: stripObjectToScalars(meta.args.newThread),
      differenceString,
    });
  },
});
