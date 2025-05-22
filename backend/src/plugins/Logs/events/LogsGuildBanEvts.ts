import { AuditLogEvent } from "discord.js";
import { LogType } from "../../../data/LogType.js";
import { findMatchingAuditLogEntry } from "../../../utils/findMatchingAuditLogEntry.js";
import { logMemberBan } from "../logFunctions/logMemberBan.js";
import { logMemberUnban } from "../logFunctions/logMemberUnban.js";
import { logsEvt } from "../types.js";
import { isLogIgnored } from "../util/isLogIgnored.js";

export const LogsGuildBanAddEvt = logsEvt({
  event: "guildBanAdd",

  async listener(meta) {
    const pluginData = meta.pluginData;
    const user = meta.args.ban.user;

    if (isLogIgnored(pluginData, LogType.MEMBER_BAN, user.id)) {
      return;
    }

    const relevantAuditLogEntry = await findMatchingAuditLogEntry(
      pluginData.guild,
      AuditLogEvent.MemberBanAdd,
      user.id,
    );
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

    const relevantAuditLogEntry = await findMatchingAuditLogEntry(
      pluginData.guild,
      AuditLogEvent.MemberBanRemove,
      user.id,
    );
    const mod = relevantAuditLogEntry?.executor ?? null;
    logMemberUnban(pluginData, {
      mod,
      userId: user.id,
      caseNumber: 0,
      reason: "",
    });
  },
});
