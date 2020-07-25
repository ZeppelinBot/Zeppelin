import { eventListener } from "knub";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { isEventIgnored } from "../functions/isEventIgnored";
import { clearIgnoredEvent } from "../functions/clearIgnoredEvents";
import { Constants as ErisConstants } from "eris";
import { safeFindRelevantAuditLogEntry } from "../functions/safeFindRelevantAuditLogEntry";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";

/**
 * Create an UNBAN case automatically when a user is unbanned manually.
 * Attempts to find the unban's details in the audit log.
 */
export const CreateUnbanCaseOnManualUnbanEvt = eventListener<ModActionsPluginType>()(
  "guildBanRemove",
  async ({ pluginData, args: { guild, user } }) => {
    if (isEventIgnored(pluginData, IgnoredEventType.Unban, user.id)) {
      clearIgnoredEvent(pluginData, IgnoredEventType.Unban, user.id);
      return;
    }

    const relevantAuditLogEntry = await safeFindRelevantAuditLogEntry(
      pluginData,
      ErisConstants.AuditLogActions.MEMBER_BAN_REMOVE,
      user.id,
    );

    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      casesPlugin.createCase({
        userId: user.id,
        modId,
        type: CaseTypes.Unban,
        auditLogId,
        automatic: true,
      });
    } else {
      casesPlugin.createCase({
        userId: user.id,
        modId: null,
        type: CaseTypes.Unban,
        automatic: true,
      });
    }
  },
);
