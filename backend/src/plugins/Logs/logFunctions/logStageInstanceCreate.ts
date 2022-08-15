import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { StageChannel, StageInstance } from "discord.js";
import { channelToTemplateSafeChannel, stageToTemplateSafeStage } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

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
