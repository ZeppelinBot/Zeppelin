import { StageChannel, StageInstance } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogStageInstanceUpdateData {
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
