import { AuditLogEvent, User } from "discord.js";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { resolveUser, UnknownUser } from "../../../utils";
import { findMatchingAuditLogEntry } from "../../../utils/findMatchingAuditLogEntry";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { clearIgnoredEvents } from "../functions/clearIgnoredEvents";
import { isEventIgnored } from "../functions/isEventIgnored";
import { IgnoredEventType, modActionsEvt } from "../types";

/**
 * Create a BAN case automatically when a user is banned manually.
 * Attempts to find the ban's details in the audit log.
 */
export const CreateBanCaseOnManualBanEvt = modActionsEvt({
  event: "guildBanAdd",
  async listener({ pluginData, args: { ban } }) {
    const user = ban.user;
    if (isEventIgnored(pluginData, IgnoredEventType.Ban, user.id)) {
      clearIgnoredEvents(pluginData, IgnoredEventType.Ban, user.id);
      return;
    }

    const relevantAuditLogEntry = await findMatchingAuditLogEntry(
      pluginData.guild,
      AuditLogEvent.MemberBanAdd,
      user.id,
    );

    const casesPlugin = pluginData.getPlugin(CasesPlugin);

    let createdCase: Case | null = null;
    let mod: User | UnknownUser | null = null;
    let reason = "";

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.executor!.id;
      const auditLogId = relevantAuditLogEntry.id;

      mod = await resolveUser(pluginData.client, modId);

      const config = mod instanceof UnknownUser ? pluginData.config.get() : await pluginData.config.getForUser(mod);

      if (config.create_cases_for_manual_actions) {
        reason = relevantAuditLogEntry.reason ?? "";
        createdCase = await casesPlugin.createCase({
          userId: user.id,
          modId,
          type: CaseTypes.Ban,
          auditLogId,
          reason: reason || undefined,
          automatic: true,
        });
      }
    } else {
      const config = pluginData.config.get();
      if (config.create_cases_for_manual_actions) {
        createdCase = await casesPlugin.createCase({
          userId: user.id,
          modId: "0",
          type: CaseTypes.Ban,
        });
      }
    }

    pluginData.getPlugin(LogsPlugin).logMemberBan({
      mod: mod ? userToTemplateSafeUser(mod) : null,
      user: userToTemplateSafeUser(user),
      caseNumber: createdCase?.case_number ?? 0,
      reason,
    });

    pluginData.state.events.emit("ban", user.id, reason);
  },
});
