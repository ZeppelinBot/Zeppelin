import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { StageChannel, StageInstance } from "discord.js";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects";

interface LogStageInstanceCreateData {
  stageInstance: StageInstance;
  stageChannel: StageChannel;
}

export function logStageInstanceCreate(pluginData: GuildPluginData<LogsPluginType>, data: LogStageInstanceCreateData) {
  return log(
    pluginData,
    LogType.STAGE_INSTANCE_CREATE,
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
