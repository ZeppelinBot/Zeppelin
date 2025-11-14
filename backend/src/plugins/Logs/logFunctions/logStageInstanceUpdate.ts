import { StageChannel, StageInstance } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogStageInstanceUpdateData {
  oldStageInstance: StageInstance | null;
  newStageInstance: StageInstance;
  stageChannel: StageChannel;
  differenceString: string;
}

export function logStageInstanceUpdate(pluginData: GuildPluginData<LogsPluginType>, data: LogStageInstanceUpdateData) {
  return log(
    pluginData,
    LogType.STAGE_INSTANCE_UPDATE,
    createTypedTemplateSafeValueContainer({
      oldStageInstance: data.oldStageInstance ? stageToTemplateSafeStage(data.oldStageInstance) : null,
      newStageInstance: stageToTemplateSafeStage(data.newStageInstance),
      stageChannel: channelToTemplateSafeChannel(data.stageChannel),
      differenceString: data.differenceString,
    }),
    {
      ...resolveChannelIds(data.newStageInstance.channel!),
    },
  );
}
