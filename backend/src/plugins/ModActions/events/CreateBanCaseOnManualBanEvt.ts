import { eventListener } from "knub";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { isEventIgnored } from "../functions/isEventIgnored";
import { clearIgnoredEvents } from "../functions/clearIgnoredEvents";
import { Constants as ErisConstants } from "eris";
import { safeFindRelevantAuditLogEntry } from "../functions/safeFindRelevantAuditLogEntry";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";

/**
 * Create a BAN case automatically when a user is banned manually.
 * Attempts to find the ban's details in the audit log.
 */
export const CreateBanCaseOnManualBanEvt = eventListener<ModActionsPluginType>()(
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
    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      casesPlugin.createCase({
        userId: user.id,
        modId,
        type: CaseTypes.Ban,
        auditLogId,
        reason: relevantAuditLogEntry.reason,
        automatic: true,
      });
    } else {
      casesPlugin.createCase({
        userId: user.id,
        modId: null,
        type: CaseTypes.Ban,
      });
    }
  },
);
