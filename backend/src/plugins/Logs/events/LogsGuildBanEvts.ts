import { GuildAuditLogs } from "discord.js";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars, UnknownUser } from "../../../utils";
import { safeFindRelevantAuditLogEntry } from "../../../utils/safeFindRelevantAuditLogEntry";
import { logsEvt } from "../types";


export const LogsGuildBanAddEvt = logsEvt({
  event: "guildBanAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const user = meta.args.ban.user;

    const relevantAuditLogEntry = await safeFindRelevantAuditLogEntry(
      pluginData,
      GuildAuditLogs.Actions.MEMBER_BAN_ADD as number,
      user.id,
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.executor : new UnknownUser();

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

export const LogsGuildBanRemoveEvt = logsEvt({
  event: "guildBanRemove",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const user = meta.args.ban.user;

    const relevantAuditLogEntry = await safeFindRelevantAuditLogEntry(
      pluginData,
      GuildAuditLogs.Actions.MEMBER_BAN_REMOVE as number,
      user.id,
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.executor : new UnknownUser();

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
