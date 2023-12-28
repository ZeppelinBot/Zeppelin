import { StageChannel, StageInstance } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
      ...resolveChannelIds(data.stageInstance.channel!),
    },
  );
}
