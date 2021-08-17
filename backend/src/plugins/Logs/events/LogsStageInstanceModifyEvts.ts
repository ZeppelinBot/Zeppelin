import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference } from "../../../utils";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects";
import { logsEvt } from "../types";
import { logStageInstanceCreate } from "../logFunctions/logStageInstanceCreate";
import { StageChannel } from "discord.js";
import { logStageInstanceDelete } from "../logFunctions/logStageInstanceDelete";
import { logStageInstanceUpdate } from "../logFunctions/logStageInstanceUpdate";

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

export const LogsStageInstanceUpdateEvt = logsEvt({
  event: "stageInstanceUpdate",

  async listener(meta) {
    const stageChannel =
      meta.args.newStageInstance.channel ??
      ((await meta.pluginData.guild.channels.fetch(meta.args.newStageInstance.channelId)) as StageChannel);

    const diff = getScalarDifference(meta.args.oldStageInstance, meta.args.newStageInstance);
    const differenceString = differenceToString(diff);

    logStageInstanceUpdate(meta.pluginData, {
      oldStageInstance: meta.args.oldStageInstance,
      newStageInstance: meta.args.newStageInstance,
      stageChannel,
      differenceString,
    });
  },
});
