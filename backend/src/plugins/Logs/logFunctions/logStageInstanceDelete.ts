import { StageChannel, StageInstance } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogStageInstanceDeleteData {
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
