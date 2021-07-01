import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";
import { logsEvt } from "../types";

export const LogsStageInstanceCreateEvt = logsEvt({
  event: "stageInstanceCreate",

  async listener(meta) {
    const stageChannel =
      meta.args.stageInstance.channel ??
      (await meta.pluginData.guild.channels.fetch(meta.args.stageInstance.channelID));
    meta.pluginData.state.guildLogs.log(LogType.STAGE_INSTANCE_CREATE, {
      stageInstance: stripObjectToScalars(meta.args.stageInstance),
      stageChannel: stripObjectToScalars(stageChannel),
    });
  },
});

export const LogsStageInstanceDeleteEvt = logsEvt({
  event: "stageInstanceDelete",

  async listener(meta) {
    const stageChannel =
      meta.args.stageInstance.channel ??
      (await meta.pluginData.guild.channels.fetch(meta.args.stageInstance.channelID));
    meta.pluginData.state.guildLogs.log(LogType.STAGE_INSTANCE_DELETE, {
      stageInstance: stripObjectToScalars(meta.args.stageInstance),
      stageChannel: stripObjectToScalars(stageChannel),
    });
  },
});

export const LogsStageInstanceUpdateEvt = logsEvt({
  event: "stageInstanceUpdate",

  async listener(meta) {
    const stageChannel =
      meta.args.newStageInstance.channel ??
      (await meta.pluginData.guild.channels.fetch(meta.args.newStageInstance.channelID));
    meta.pluginData.state.guildLogs.log(LogType.STAGE_INSTANCE_UPDATE, {
      oldStageInstance: stripObjectToScalars(meta.args.oldStageInstance),
      newStageInstance: stripObjectToScalars(meta.args.newStageInstance),
      stageChannel: stripObjectToScalars(stageChannel),
    });
  },
});
