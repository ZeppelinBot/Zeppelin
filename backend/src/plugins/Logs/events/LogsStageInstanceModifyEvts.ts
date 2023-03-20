import { StageChannel, StageInstance } from "discord.js";
import { differenceToString, getScalarDifference } from "../../../utils";
import { filterObject } from "../../../utils/filterObject";
import { logStageInstanceCreate } from "../logFunctions/logStageInstanceCreate";
import { logStageInstanceDelete } from "../logFunctions/logStageInstanceDelete";
import { logStageInstanceUpdate } from "../logFunctions/logStageInstanceUpdate";
import { logsEvt } from "../types";

export const LogsStageInstanceCreateEvt = logsEvt({
  event: "stageInstanceCreate",

  async listener(meta) {
    const stageChannel =
      meta.args.stageInstance.channel ??
      ((await meta.pluginData.guild.channels.fetch(meta.args.stageInstance.channelId)) as StageChannel);

    logStageInstanceCreate(meta.pluginData, {
      stageInstance: meta.args.stageInstance,
      stageChannel,
    });
  },
});

export const LogsStageInstanceDeleteEvt = logsEvt({
  event: "stageInstanceDelete",

  async listener(meta) {
    const stageChannel =
      meta.args.stageInstance.channel ??
      ((await meta.pluginData.guild.channels.fetch(meta.args.stageInstance.channelId)) as StageChannel);

    logStageInstanceDelete(meta.pluginData, {
      stageInstance: meta.args.stageInstance,
      stageChannel,
    });
  },
});

const validStageInstanceDiffProps: Set<keyof StageInstance> = new Set([
  "topic",
  "privacyLevel",
  "discoverableDisabled",
]);

export const LogsStageInstanceUpdateEvt = logsEvt({
  event: "stageInstanceUpdate",

  async listener(meta) {
    const stageChannel =
      meta.args.newStageInstance.channel ??
      ((await meta.pluginData.guild.channels.fetch(meta.args.newStageInstance.channelId)) as StageChannel);

    const oldStageInstanceDiffProps = filterObject(meta.args.oldStageInstance || {}, (v, k) =>
      validStageInstanceDiffProps.has(k),
    );
    const newStageInstanceDiffProps = filterObject(meta.args.newStageInstance, (v, k) =>
      validStageInstanceDiffProps.has(k),
    );
    const diff = getScalarDifference(oldStageInstanceDiffProps, newStageInstanceDiffProps);
    const differenceString = differenceToString(diff);

    logStageInstanceUpdate(meta.pluginData, {
      oldStageInstance: meta.args.oldStageInstance,
      newStageInstance: meta.args.newStageInstance,
      stageChannel,
      differenceString,
    });
  },
});
