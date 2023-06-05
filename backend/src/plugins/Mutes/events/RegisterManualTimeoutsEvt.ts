import { AuditLogChange, AuditLogEvent } from "discord.js";
import moment from "moment-timezone";
import { MuteTypes } from "../../../data/MuteTypes";
import { resolveUser } from "../../../utils";
import { mutesEvt } from "../types";

export const RegisterManualTimeoutsEvt = mutesEvt({
  event: "guildAuditLogEntryCreate",
  async listener({ pluginData, args: { auditLogEntry } }) {
    // Ignore the bot's own audit log events
    if (auditLogEntry.executorId === pluginData.client.user?.id) {
      return;
    }
    if (auditLogEntry.action !== AuditLogEvent.MemberUpdate) {
      return;
    }

    const target = await resolveUser(pluginData.client, auditLogEntry.targetId!);

    // Only act based on the last changes in this log
    let lastTimeoutChange: AuditLogChange | null = null;
    for (const change of auditLogEntry.changes) {
      if (change.key === "communication_disabled_until") {
        lastTimeoutChange = change;
      }
    }
    if (!lastTimeoutChange) {
      return;
    }

    const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(target.id);

    if (lastTimeoutChange.new == null && existingMute) {
      await pluginData.state.mutes.clear(target.id);
      return;
    }

    if (lastTimeoutChange.new != null) {
      const expiresAtTimestamp = moment.utc(lastTimeoutChange.new as string).valueOf();
      if (existingMute) {
        await pluginData.state.mutes.updateExpiresAt(target.id, expiresAtTimestamp);
      } else {
        await pluginData.state.mutes.addMute({
          userId: target.id,
          type: MuteTypes.Timeout,
          expiresAt: expiresAtTimestamp,
          timeoutExpiresAt: expiresAtTimestamp,
        });
      }
    }
  },
});
