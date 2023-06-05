import { AuditLogEvent } from "discord.js";
import { guildPluginEventListener } from "knub";
import { updateMemberCacheForMember } from "../functions/updateMemberCacheForMember";
import { GuildMemberCachePluginType } from "../types";

export const updateMemberCacheOnRoleChange = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildAuditLogEntryCreate",
  async listener({ pluginData, args: { auditLogEntry } }) {
    if (auditLogEntry.action !== AuditLogEvent.MemberRoleUpdate) {
      return;
    }

    updateMemberCacheForMember(pluginData, auditLogEntry.targetId!);
  },
});
