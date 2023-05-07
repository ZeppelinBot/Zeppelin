import { AuditLogEvent } from "discord.js";
import { guildPluginEventListener } from "knub";
import { updateMemberCacheForMember } from "../functions/updateMemberCacheForMember";
import { GuildMemberCachePluginType } from "../types";

export const updateMemberCacheOnMemberUpdate = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildAuditLogEntryCreate",
  async listener({ pluginData, args: { auditLogEntry } }) {
    if (auditLogEntry.action !== AuditLogEvent.MemberUpdate) {
      return;
    }

    updateMemberCacheForMember(pluginData, auditLogEntry.targetId!);
  },
});
