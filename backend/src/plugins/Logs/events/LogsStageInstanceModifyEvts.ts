import { channelToConfigAccessibleChannel, stageToConfigAccessibleStage } from "../../../utils/configAccessibleObjects";
import { LogType } from "../../../data/LogType";
import { differenceToString, getScalarDifference, stripObjectToScalars } from "../../../utils";
import { logsEvt } from "../types";

export const LogsStageInstanceCreateEvt = logsEvt({
  event: "stageInstanceCreate",

  async listener(meta) {
    const stageChannel =
      meta.args.stageInstance.channel ??
      (await meta.pluginData.guild.channels.fetch(meta.args.stageInstance.channelId))!;

    meta.pluginData.state.guildLogs.log(LogType.STAGE_INSTANCE_CREATE, {
      stageInstance: stageToConfigAccessibleStage(meta.args.stageInstance),
      stageChannel: channelToConfigAccessibleChannel(stageChannel),
    });
  },
});

export const LogsStageInstanceDeleteEvt = logsEvt({
  event: "stageInstanceDelete",

  async listener(meta) {
    const stageChannel =
      meta.args.stageInstance.channel ??
      (await meta.pluginData.guild.channels.fetch(meta.args.stageInstance.channelId))!;

    meta.pluginData.state.guildLogs.log(LogType.STAGE_INSTANCE_DELETE, {
      stageInstance: stageToConfigAccessibleStage(meta.args.stageInstance),
      stageChannel: channelToConfigAccessibleChannel(stageChannel),
    });
  },
});

export const LogsStageInstanceUpdateEvt = logsEvt({
  event: "stageInstanceUpdate",

  async listener(meta) {
    const stageChannel =
      meta.args.newStageInstance.channel ??
      (await meta.pluginData.guild.channels.fetch(meta.args.newStageInstance.channelId))!;

    const diff = getScalarDifference(meta.args.oldStageInstance, meta.args.newStageInstance);
    const differenceString = differenceToString(diff);

    meta.pluginData.state.guildLogs.log(LogType.STAGE_INSTANCE_UPDATE, {
      oldStageInstance: stageToConfigAccessibleStage(meta.args.oldStageInstance),
      newStageInstance: stageToConfigAccessibleStage(meta.args.newStageInstance),
      stageChannel: channelToConfigAccessibleChannel(stageChannel),
      differenceString,
    });
  },
});
