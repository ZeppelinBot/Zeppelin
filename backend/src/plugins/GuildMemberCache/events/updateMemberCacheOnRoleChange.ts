import { AuditLogEvent } from "discord.js";
import { guildPluginEventListener } from "vety";
import { updateMemberCacheForMember } from "../functions/updateMemberCacheForMember.js";
import { GuildMemberCachePluginType } from "../types.js";

export const updateMemberCacheOnRoleChange = guildPluginEventListener<GuildMemberCachePluginType>()({
  event: "guildAuditLogEntryCreate",
  async listener({ pluginData, args: { auditLogEntry } }) {
    if (auditLogEntry.action !== AuditLogEvent.MemberRoleUpdate) {
      return;
    }

    updateMemberCacheForMember(pluginData, auditLogEntry.targetId!);
  },
});
