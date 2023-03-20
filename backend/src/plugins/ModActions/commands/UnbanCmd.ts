import { Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { clearExpiringTempban } from "../../../data/loops/expiringTempbansLoop";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { hasPermission, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveUser } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { ignoreEvent } from "../functions/ignoreEvent";
import { IgnoredEventType, modActionsCmd } from "../types";

const opts = {
  mod: ct.member({ option: true }),
};

export const UnbanCmd = modActionsCmd({
  trigger: "unban",
  permission: "can_unban",
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
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg, channelId: msg.channel.id }))) {
        sendErrorMessage(pluginData, msg.channel, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, user.id);
    const reason = formatReasonWithAttachments(args.reason, [...msg.attachments.values()]);

    try {
      ignoreEvent(pluginData, IgnoredEventType.Unban, user.id);
      await pluginData.guild.bans.remove(user.id as Snowflake, reason ?? undefined);
    } catch {
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
      ppId: mod.id !== msg.author.id ? msg.author.id : undefined,
    });
    // Delete the tempban, if one exists
    const tempban = await pluginData.state.tempbans.findExistingTempbanForUserId(user.id);
    if (tempban) {
      clearExpiringTempban(tempban);
      await pluginData.state.tempbans.clear(user.id);
    }

    // Confirm the action
    sendSuccessMessage(pluginData, msg.channel, `Member unbanned (Case #${createdCase.case_number})`);

    // Log the action
    pluginData.getPlugin(LogsPlugin).logMemberUnban({
      mod: mod.user,
      userId: user.id,
      caseNumber: createdCase.case_number,
      reason: reason ?? "",
    });

    pluginData.state.events.emit("unban", user.id);
  },
});
