import { GuildAuditLogs, User } from "discord.js";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { LogType } from "../../../data/LogType";
import { resolveUser, stripObjectToScalars, UnknownUser } from "../../../utils";
import { safeFindRelevantAuditLogEntry } from "../../../utils/safeFindRelevantAuditLogEntry";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { clearIgnoredEvents } from "../functions/clearIgnoredEvents";
import { isEventIgnored } from "../functions/isEventIgnored";
import { IgnoredEventType, modActionsEvt } from "../types";

/**
 * Create an UNBAN case automatically when a user is unbanned manually.
 * Attempts to find the unban's details in the audit log.
 */
export const CreateUnbanCaseOnManualUnbanEvt = modActionsEvt({
  event: "guildBanRemove",
  async listener({ pluginData, args: { ban } }) {
    const user = ban.user;
    if (isEventIgnored(pluginData, IgnoredEventType.Unban, user.id)) {
      clearIgnoredEvents(pluginData, IgnoredEventType.Unban, user.id);
      return;
    }

    const relevantAuditLogEntry = await safeFindRelevantAuditLogEntry(
      pluginData,
      GuildAuditLogs.Actions.MEMBER_BAN_REMOVE as number,
      user.id,
    );

    const casesPlugin = pluginData.getPlugin(CasesPlugin);

    let createdCase: Case | null = null;
    let mod: User | UnknownUser | null = null;

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.executor!.id;
      const auditLogId = relevantAuditLogEntry.id;

      mod = await resolveUser(pluginData.client, modId);

      const config = mod instanceof UnknownUser ? pluginData.config.get() : await pluginData.config.getForUser(mod);

      if (config.create_cases_for_manual_actions) {
        createdCase = await casesPlugin.createCase({
          userId: user.id,
          modId,
          type: CaseTypes.Unban,
          auditLogId,
          automatic: true,
        });
      }
    } else {
      const config = pluginData.config.get();
      if (config.create_cases_for_manual_actions) {
        createdCase = await casesPlugin.createCase({
          userId: user.id,
          modId: "0",
          type: CaseTypes.Unban,
          automatic: true,
        });
      }
    }

    pluginData.state.serverLogs.log(LogType.MEMBER_UNBAN, {
      mod: mod ? stripObjectToScalars(mod, ["user"]) : null,
      userId: user.id,
      caseNumber: createdCase?.case_number ?? 0,
    });

    pluginData.state.events.emit("unban", user.id);
  },
});
