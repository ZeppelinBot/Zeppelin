import { ThreadChannel } from "discord.js";
import { differenceToString, getScalarDifference } from "../../../utils.js";
import { filterObject } from "../../../utils/filterObject.js";
import { logThreadCreate } from "../logFunctions/logThreadCreate.js";
import { logThreadDelete } from "../logFunctions/logThreadDelete.js";
import { logThreadUpdate } from "../logFunctions/logThreadUpdate.js";
import { logsEvt } from "../types.js";

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

const validThreadDiffProps: Set<keyof ThreadChannel> = new Set(["name", "autoArchiveDuration", "rateLimitPerUser"]);

export const LogsThreadUpdateEvt = logsEvt({
  event: "threadUpdate",

  async listener(meta) {
    const oldThreadDiffProps = filterObject(meta.args.oldThread || {}, (v, k) => validThreadDiffProps.has(k));
    const newThreadDiffProps = filterObject(meta.args.newThread, (v, k) => validThreadDiffProps.has(k));
    const diff = getScalarDifference(oldThreadDiffProps, newThreadDiffProps);
    const differenceString = differenceToString(diff);

    logThreadUpdate(meta.pluginData, {
      oldThread: meta.args.oldThread,
      newThread: meta.args.newThread,
      differenceString,
    });
  },
});
