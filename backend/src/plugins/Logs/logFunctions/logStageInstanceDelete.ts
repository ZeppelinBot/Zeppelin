import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { StageChannel, StageInstance } from "discord.js";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects";

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
      channel: data.stageInstance.channel!.id,
      category: data.stageInstance.channel!.parentId,
    },
  );
}
