import { modActionsCmd, IgnoredEventType } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { canActOn, sendErrorMessage, hasPermission, sendSuccessMessage } from "../../../pluginUtils";
import { resolveUser, resolveMember, stripObjectToScalars } from "../../../utils";
import { isBanned } from "../functions/isBanned";
import { readContactMethodsFromArgs } from "../functions/readContactMethodsFromArgs";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { banUserId } from "../functions/banUserId";
import { ignoreEvent } from "../functions/ignoreEvent";
import { LogType } from "../../../data/LogType";
import { CaseTypes } from "../../../data/CaseTypes";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";

const opts = {
  mod: ct.member({ option: true }),
};

export const ForcebanCmd = modActionsCmd({
  trigger: "forceban",
  permission: "can_ban",
  description: "Force-ban the specified user, even if they aren't on the server",

  signature: [
    {
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    // If the user exists as a guild member, make sure we can act on them first
    const member = await resolveMember(pluginData.client, pluginData.guild, user.id);
    if (member && !canActOn(pluginData, msg.member, member)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot forceban this user: insufficient permissions");
      return;
    }

    // Make sure the user isn't already banned
    const banned = await isBanned(pluginData, user.id);
    if (banned) {
      sendErrorMessage(pluginData, msg.channel, `User is already banned`);
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!hasPermission(pluginData, "can_act_as_other", { message: msg })) {
        sendErrorMessage(pluginData, msg.channel, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    const reason = formatReasonWithAttachments(args.reason, msg.attachments);

    ignoreEvent(pluginData, IgnoredEventType.Ban, user.id);
    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, user.id);

    try {
      // FIXME: Use banUserId()?
      await pluginData.guild.banMember(user.id, 1, reason != null ? encodeURIComponent(reason) : undefined);
    } catch {
      sendErrorMessage(pluginData, msg.channel, "Failed to forceban member");
      return;
    }

    // Create a case
    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const createdCase = await casesPlugin.createCase({
      userId: user.id,
      modId: mod.id,
      type: CaseTypes.Ban,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : undefined,
    });

    // Confirm the action
    sendSuccessMessage(pluginData, msg.channel, `Member forcebanned (Case #${createdCase.case_number})`);

    // Log the action
    pluginData.state.serverLogs.log(LogType.MEMBER_FORCEBAN, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
      caseNumber: createdCase.case_number,
      reason,
    });

    pluginData.state.events.emit("ban", user.id, reason);
  },
});
