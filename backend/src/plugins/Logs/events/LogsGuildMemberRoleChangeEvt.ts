import { APIRole, AuditLogChange, AuditLogEvent } from "discord.js";
import { guildPluginEventListener } from "vety";
import { resolveRole } from "../../../utils.js";
import { logMemberRoleAdd } from "../logFunctions/logMemberRoleAdd.js";
import { logMemberRoleRemove } from "../logFunctions/logMemberRoleRemove.js";
import { LogsPluginType } from "../types.js";

type RoleAddChange = AuditLogChange & {
  key: "$add";
  new: Array<Pick<APIRole, "id" | "name">>;
};

function isRoleAddChange(change: AuditLogChange): change is RoleAddChange {
  return change.key === "$add";
}

type RoleRemoveChange = AuditLogChange & {
  key: "$remove";
  new: Array<Pick<APIRole, "id" | "name">>;
};

function isRoleRemoveChange(change: AuditLogChange): change is RoleRemoveChange {
  return change.key === "$remove";
}

export const LogsGuildMemberRoleChangeEvt = guildPluginEventListener<LogsPluginType>()({
  event: "guildAuditLogEntryCreate",
  async listener({ pluginData, args: { auditLogEntry } }) {
    // Ignore the bot's own audit log events
    if (auditLogEntry.executorId === pluginData.client.user?.id) {
      return;
    }
    if (auditLogEntry.action !== AuditLogEvent.MemberRoleUpdate) {
      return;
    }

    const member = await pluginData.guild.members.fetch(auditLogEntry.targetId!);
    const mod = auditLogEntry.executorId ? await pluginData.client.users.fetch(auditLogEntry.executorId) : null;
    for (const change of auditLogEntry.changes) {
      if (isRoleAddChange(change)) {
        const addedRoles = change.new.map((r) => resolveRole(pluginData.guild, r.id));
        logMemberRoleAdd(pluginData, {
          member,
          mod,
          roles: addedRoles,
        });
      }
      if (isRoleRemoveChange(change)) {
        const removedRoles = change.new.map((r) => resolveRole(pluginData.guild, r.id));
        logMemberRoleRemove(pluginData, {
          member,
          mod,
          roles: removedRoles,
        });
      }
    }
  },
});
