import { StageChannel, StageInstance } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogStageInstanceDeleteData {
  stageInstance: StageInstance;
  stageChannel: StageChannel;
}

export function logStageInstanceDelete(pluginData: GuildPluginData<LogsPluginType>, data: LogStageInstanceDeleteData) {
  return log(
    pluginData,
    LogType.STAGE_INSTANCE_DELETE,
    createTypedTemplateSafeValueContainer({
      stageInstance: stageToTemplateSafeStage(data.stageInstance),
      stageChannel: channelToTemplateSafeChannel(data.stageChannel),
    }),
    {
      ...resolveChannelIds(data.stageInstance.channel!),
    },
  );
}
