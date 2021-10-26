import { GuildAuditLogs } from "discord.js";
import { LogType } from "../../../data/LogType";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { logsEvt } from "../types";
import { logMemberBan } from "../logFunctions/logMemberBan";
import { isLogIgnored } from "../util/isLogIgnored";
import { logMemberUnban } from "../logFunctions/logMemberUnban";
import { findMatchingAuditLogEntry } from "../../../utils/findMatchingAuditLogEntry";

export const LogsGuildBanAddEvt = logsEvt({
  event: "guildBanAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const user = meta.args.ban.user;

    if (isLogIgnored(pluginData, LogType.MEMBER_BAN, user.id)) {
      return;
    }

    const relevantAuditLogEntry = await findMatchingAuditLogEntry(pluginData.guild, "MEMBER_BAN_ADD", user.id);
    const mod = relevantAuditLogEntry?.executor ?? null;
    logMemberBan(meta.pluginData, {
      mod,
      user,
      caseNumber: 0,
      reason: "",
    });
  },
});

export const LogsGuildBanRemoveEvt = logsEvt({
  event: "guildBanRemove",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const user = meta.args.ban.user;

    if (isLogIgnored(pluginData, LogType.MEMBER_UNBAN, user.id)) {
      return;
    }

    const relevantAuditLogEntry = await findMatchingAuditLogEntry(pluginData.guild, "MEMBER_BAN_REMOVE", user.id);
    const mod = relevantAuditLogEntry?.executor ?? null;

    logMemberUnban(pluginData, {
      mod,
      userId: user.id,
      caseNumber: 0,
      reason: "",
    });
  },
});
