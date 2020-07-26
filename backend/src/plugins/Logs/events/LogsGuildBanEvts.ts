import { logsEvent } from "../types";
import { stripObjectToScalars, findRelevantAuditLogEntry, UnknownUser } from "src/utils";
import { LogType } from "src/data/LogType";
import { Constants as ErisConstants } from "eris";

export const LogsGuildBanAddEvt = logsEvent({
  event: "guildBanAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const user = meta.args.user;

    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      pluginData.guildConfig,
      ErisConstants.AuditLogActions.MEMBER_BAN_ADD,
      user.id,
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : new UnknownUser();

    pluginData.state.guildLogs.log(
      LogType.MEMBER_BAN,
      {
        mod: stripObjectToScalars(mod),
        user: stripObjectToScalars(user),
      },
      user.id,
    );
  },
});

export const LogsGuildBanRemoveEvt = logsEvent({
  event: "guildBanRemove",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const user = meta.args.user;

    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      pluginData.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_REMOVE,
      user.id,
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : new UnknownUser();

    pluginData.state.guildLogs.log(
      LogType.MEMBER_UNBAN,
      {
        mod: stripObjectToScalars(mod),
        userId: user.id,
      },
      user.id,
    );
  },
});
