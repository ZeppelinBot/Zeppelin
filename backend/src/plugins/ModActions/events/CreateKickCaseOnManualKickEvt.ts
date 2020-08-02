import { eventListener } from "knub";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { isEventIgnored } from "../functions/isEventIgnored";
import { clearIgnoredEvents } from "../functions/clearIgnoredEvents";
import { Constants as ErisConstants } from "eris";
import { safeFindRelevantAuditLogEntry } from "../functions/safeFindRelevantAuditLogEntry";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { logger } from "../../../logger";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";

/**
 * Create a KICK case automatically when a user is kicked manually.
 * Attempts to find the kick's details in the audit log.
 */
export const CreateKickCaseOnManualKickEvt = eventListener<ModActionsPluginType>()(
  "guildMemberRemove",
  async ({ pluginData, args: { member } }) => {
    if (isEventIgnored(pluginData, IgnoredEventType.Kick, member.id)) {
      clearIgnoredEvents(pluginData, IgnoredEventType.Kick, member.id);
      return;
    }

    const kickAuditLogEntry = await safeFindRelevantAuditLogEntry(
      pluginData,
      ErisConstants.AuditLogActions.MEMBER_KICK,
      member.id,
    );

    if (kickAuditLogEntry) {
      const existingCaseForThisEntry = await pluginData.state.cases.findByAuditLogId(kickAuditLogEntry.id);
      let createdCase;
      if (existingCaseForThisEntry) {
        logger.warn(
          `Tried to create duplicate case for audit log entry ${kickAuditLogEntry.id}, existing case id ${existingCaseForThisEntry.id}`,
        );
      } else {
        const casesPlugin = pluginData.getPlugin(CasesPlugin);
        createdCase = await casesPlugin.createCase({
          userId: member.id,
          modId: kickAuditLogEntry.user.id,
          type: CaseTypes.Kick,
          auditLogId: kickAuditLogEntry.id,
          reason: kickAuditLogEntry.reason,
          automatic: true,
        });
      }

      pluginData.state.serverLogs.log(LogType.MEMBER_KICK, {
        user: stripObjectToScalars(member.user),
        mod: stripObjectToScalars(kickAuditLogEntry.user),
        caseNumber: createdCase.case_number,
      });
    }
  },
);
