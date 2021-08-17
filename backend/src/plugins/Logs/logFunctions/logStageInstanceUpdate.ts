import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { StageChannel, StageInstance } from "discord.js";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects";

interface LogStageInstanceUpdateData {
  oldStageInstance: StageInstance;
  newStageInstance: StageInstance;
  stageChannel: StageChannel;
  differenceString: string;
}

export function logStageInstanceUpdate(pluginData: GuildPluginData<LogsPluginType>, data: LogStageInstanceUpdateData) {
  return log(
    pluginData,
    LogType.STAGE_INSTANCE_UPDATE,
    createTypedTemplateSafeValueContainer({
      oldStageInstance: stageToTemplateSafeStage(data.oldStageInstance),
      newStageInstance: stageToTemplateSafeStage(data.newStageInstance),
      stageChannel: channelToTemplateSafeChannel(data.stageChannel),
      differenceString: data.differenceString,
    }),
    {
      channel: data.newStageInstance.channel!.id,
      category: data.newStageInstance.channel!.parentId,
    },
  );
}
