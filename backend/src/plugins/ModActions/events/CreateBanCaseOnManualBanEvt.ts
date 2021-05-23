import { IgnoredEventType, modActionsEvt } from "../types";
import { isEventIgnored } from "../functions/isEventIgnored";
import { clearIgnoredEvents } from "../functions/clearIgnoredEvents";
import { Constants as ErisConstants, User } from "eris";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { safeFindRelevantAuditLogEntry } from "../../../utils/safeFindRelevantAuditLogEntry";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars, resolveUser, UnknownUser } from "../../../utils";
import { Case } from "../../../data/entities/Case";

/**
 * Create a BAN case automatically when a user is banned manually.
 * Attempts to find the ban's details in the audit log.
 */
export const CreateBanCaseOnManualBanEvt = modActionsEvt({
  event: "guildBanAdd",
  async listener({ pluginData, args: { guild, user } }) {
    if (isEventIgnored(pluginData, IgnoredEventType.Ban, user.id)) {
      clearIgnoredEvents(pluginData, IgnoredEventType.Ban, user.id);
      return;
    }

    const relevantAuditLogEntry = await safeFindRelevantAuditLogEntry(
      pluginData,
      ErisConstants.AuditLogActions.MEMBER_BAN_ADD,
      user.id,
    );

    const casesPlugin = pluginData.getPlugin(CasesPlugin);

    let createdCase: Case | null = null;
    let mod: User | UnknownUser | null = null;
    let reason = "";

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      mod = await resolveUser(pluginData.client, modId);

      const config = mod instanceof UnknownUser ? pluginData.config.get() : await pluginData.config.getForUser(mod);

      if (config.create_cases_for_manual_actions) {
        reason = relevantAuditLogEntry.reason || "";
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

    pluginData.state.serverLogs.log(LogType.MEMBER_BAN, {
      mod: mod ? stripObjectToScalars(mod, ["user"]) : null,
      user: stripObjectToScalars(user, ["user"]),
      caseNumber: createdCase?.case_number ?? 0,
      reason,
    });

    pluginData.state.events.emit("ban", user.id, reason);
  },
});
