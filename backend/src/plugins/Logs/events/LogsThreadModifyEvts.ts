import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { logsEvt } from "../types";
import { logThreadCreate } from "../logFunctions/logThreadCreate";
import { logThreadDelete } from "../logFunctions/logThreadDelete";
import { logThreadUpdate } from "../logFunctions/logThreadUpdate";
import { TextChannel, ThreadChannel, VoiceChannel } from "discord.js";
import { filterObject } from "../../../utils/filterObject";

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
