import { AuditLogChange, AuditLogEvent } from "discord.js";
import moment from "moment-timezone";
import { CaseTypes } from "../../../data/CaseTypes";
import { resolveUser } from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { modActionsEvt } from "../types";

export const AuditLogEvents = modActionsEvt({
  event: "guildAuditLogEntryCreate",
  async listener({ pluginData, args: { auditLogEntry } }) {
    // Ignore the bot's own audit log events
    if (auditLogEntry.executorId === pluginData.client.user?.id) {
      return;
    }

    const config = pluginData.config.get();
    const casesPlugin = pluginData.getPlugin(CasesPlugin);

    // Create mute/unmute cases for manual timeouts
    if (auditLogEntry.action === AuditLogEvent.MemberUpdate && config.create_cases_for_manual_actions) {
      const target = await resolveUser(pluginData.client, auditLogEntry.targetId!);

      // Only act based on the last changes in this log
      let muteChange: AuditLogChange | null = null;
      let unmuteChange: AuditLogChange | null = null;
      for (const change of auditLogEntry.changes) {
        if (change.key === "communication_disabled_until") {
          if (change.new == null) {
            unmuteChange = change;
          } else {
            muteChange = change;
            unmuteChange = null;
          }
        }
      }

      if (muteChange) {
        const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(target.id);
        const existingCaseId = existingMute?.case_id;
        if (existingCaseId) {
          await casesPlugin.createCaseNote({
            caseId: existingCaseId,
            modId: auditLogEntry.executor?.id || "0",
            body: auditLogEntry.reason || "",
            noteDetails: [`Timeout set to expire on <t:${moment.utc(muteChange.new as string).valueOf()}>`],
          });
        } else {
          await casesPlugin.createCase({
            userId: target.id,
            modId: auditLogEntry.executor?.id || "0",
            type: CaseTypes.Mute,
            auditLogId: auditLogEntry.id,
            reason: auditLogEntry.reason || "",
            automatic: true,
          });
        }
      }

      if (unmuteChange) {
        await casesPlugin.createCase({
          userId: target.id,
          modId: auditLogEntry.executor?.id || "0",
          type: CaseTypes.Unmute,
          auditLogId: auditLogEntry.id,
          reason: auditLogEntry.reason || "",
          automatic: true,
        });
      }
    }
  },
});
