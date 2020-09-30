import { IgnoredEventType, modActionsEvt } from "../types";
import { isEventIgnored } from "../functions/isEventIgnored";
import { clearIgnoredEvents } from "../functions/clearIgnoredEvents";
import { Constants as ErisConstants } from "eris";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { safeFindRelevantAuditLogEntry } from "../../../utils/safeFindRelevantAuditLogEntry";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars, resolveUser } from "../../../utils";

/**
 * Create a BAN case automatically when a user is banned manually.
 * Attempts to find the ban's details in the audit log.
 */
export const CreateBanCaseOnManualBanEvt = modActionsEvt(
  "guildBanAdd",
  async ({ pluginData, args: { guild, user } }) => {
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

    let createdCase;
    let mod = null;
    let reason = "";

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      mod = resolveUser(pluginData.client, modId);
      reason = relevantAuditLogEntry.reason;
      createdCase = await casesPlugin.createCase({
        userId: user.id,
        modId,
        type: CaseTypes.Ban,
        auditLogId,
        reason,
        automatic: true,
      });
    } else {
      createdCase = await casesPlugin.createCase({
        userId: user.id,
        modId: null,
        type: CaseTypes.Ban,
      });
    }

    mod = await mod;
    pluginData.state.serverLogs.log(LogType.MEMBER_BAN, {
      mod: mod ? stripObjectToScalars(mod, ["user"]) : null,
      user: stripObjectToScalars(user, ["user"]),
      caseNumber: createdCase.case_number,
      reason,
    });
  },
);
