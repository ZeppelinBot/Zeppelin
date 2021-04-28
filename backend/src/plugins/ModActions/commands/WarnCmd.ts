import { modActionsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { Case } from "../../../data/entities/Case";
import { canActOn, hasPermission, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogType } from "../../../data/LogType";
import { CaseTypes } from "../../../data/CaseTypes";
import { errorMessage, resolveMember, resolveUser, stripObjectToScalars } from "../../../utils";
import { isBanned } from "../functions/isBanned";
import { waitForReaction } from "knub/dist/helpers";
import { readContactMethodsFromArgs } from "../functions/readContactMethodsFromArgs";
import { warnMember } from "../functions/warnMember";
import { TextChannel } from "eris";

export const WarnCmd = modActionsCmd({
  trigger: "warn",
  permission: "can_warn",
  description: "Send a warning to the specified user",

  signature: {
    user: ct.string(),
    reason: ct.string({ catchAll: true }),

    mod: ct.member({ option: true }),
    notify: ct.string({ option: true }),
    "notify-channel": ct.textChannel({ option: true }),
  },

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    const memberToWarn = await resolveMember(pluginData.client, pluginData.guild, user.id);

    if (!memberToWarn) {
      const _isBanned = await isBanned(pluginData, user.id);
      if (_isBanned) {
        sendErrorMessage(pluginData, msg.channel, `User is banned`);
      } else {
        sendErrorMessage(pluginData, msg.channel, `User not found on the server`);
      }

      return;
    }

    // Make sure we're allowed to warn this member
    if (!canActOn(pluginData, msg.member, memberToWarn)) {
      sendErrorMessage(pluginData, msg.channel, "Cannot warn: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!hasPermission(pluginData, "can_act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("You don't have permission to use -mod"));
        return;
      }

      mod = args.mod;
    }

    const config = pluginData.config.get();
    const reason = formatReasonWithAttachments(args.reason, msg.attachments);

    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const priorWarnAmount = await casesPlugin.getCaseTypeAmountForUserId(memberToWarn.id, CaseTypes.Warn);
    if (config.warn_notify_enabled && priorWarnAmount >= config.warn_notify_threshold) {
      const tooManyWarningsMsg = await msg.channel.createMessage(
        config.warn_notify_message.replace("{priorWarnings}", `${priorWarnAmount}`),
      );

      const reply = await waitForReaction(pluginData.client, tooManyWarningsMsg, ["✅", "❌"], msg.author.id);
      tooManyWarningsMsg.delete();
      if (!reply || reply.name === "❌") {
        msg.channel.createMessage(errorMessage("Warn cancelled by moderator"));
        return;
      }
    }

    let contactMethods;
    try {
      contactMethods = readContactMethodsFromArgs(args);
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, e.message);
      return;
    }

    const warnResult = await warnMember(pluginData, memberToWarn, reason, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId: mod.id !== msg.author.id ? msg.author.id : undefined,
        reason,
      },
      retryPromptChannel: msg.channel as TextChannel,
    });

    if (warnResult.status === "failed") {
      sendErrorMessage(pluginData, msg.channel, "Failed to warn user");
      return;
    }

    const messageResultText = warnResult.notifyResult.text ? ` (${warnResult.notifyResult.text})` : "";

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Warned **${memberToWarn.user.username}#${memberToWarn.user.discriminator}** (Case #${warnResult.case.case_number})${messageResultText}`,
    );
  },
});
