import { modActionsCommand, IgnoredEventType } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, hasPermission, sendSuccessMessage } from "../../../pluginUtils";
import { resolveUser, stripObjectToScalars } from "../../../utils";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { LogType } from "src/data/LogType";
import { ignoreEvent } from "../functions/ignoreEvent";
import { CaseTypes } from "src/data/CaseTypes";
import { CasesPlugin } from "src/plugins/Cases/CasesPlugin";

const opts = {
  mod: ct.member({ option: true }),
};

export const UnbanCmd = modActionsCommand({
  trigger: "unban",
  permission: "can_ban",
  description: "Unban the specified member",

  signature: [
    {
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user) return sendErrorMessage(pluginData, msg.channel, `User not found`);

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!hasPermission(pluginData, "can_act_as_other", { message: msg, channelId: msg.channel.id })) {
        sendErrorMessage(pluginData, msg.channel, "No permission for -mod");
        return;
      }

      mod = args.mod;
    }

    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, user.id);
    const reason = formatReasonWithAttachments(args.reason, msg.attachments);

    try {
      ignoreEvent(pluginData, IgnoredEventType.Unban, user.id);
      await pluginData.guild.unbanMember(user.id, encodeURIComponent(reason));
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, "Failed to unban member; are you sure they're banned?");
      return;
    }

    // Create a case
    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const createdCase = await casesPlugin.createCase({
      userId: user.id,
      modId: mod.id,
      type: CaseTypes.Unban,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    });

    // Confirm the action
    sendSuccessMessage(pluginData, msg.channel, `Member unbanned (Case #${createdCase.case_number})`);

    // Log the action
    pluginData.state.serverLogs.log(LogType.MEMBER_UNBAN, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
      caseNumber: createdCase.case_number,
      reason,
    });
  },
});
