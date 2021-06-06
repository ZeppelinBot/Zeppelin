import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { LogType } from "../../../data/LogType";
import { CasesPlugin } from "../../../plugins/Cases/CasesPlugin";
import { canActOn, hasPermission, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveMember, resolveUser, stripObjectToScalars } from "../../../utils";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { modActionsCmd } from "../types";

const opts = {
  mod: ct.member({ option: true }),
};

export const AddCaseCmd = modActionsCmd({
  trigger: "addcase",
  permission: "can_addcase",
  description: "Add an arbitrary case to the specified user without taking any action",

  signature: [
    {
      type: ct.string(),
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
      sendErrorMessage(pluginData, msg.channel, "Cannot add case on this user: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
        sendErrorMessage(pluginData, msg.channel, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    // Verify the case type is valid
    const type: string = args.type[0].toUpperCase() + args.type.slice(1).toLowerCase();
    if (!CaseTypes[type]) {
      sendErrorMessage(pluginData, msg.channel, "Cannot add case: invalid case type");
      return;
    }

    const reason = formatReasonWithAttachments(args.reason, msg.attachments.array());

    // Create the case
    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const theCase: Case = await casesPlugin.createCase({
      userId: user.id,
      modId: mod.id,
      type: CaseTypes[type],
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : undefined,
    });

    if (user) {
      sendSuccessMessage(
        pluginData,
        msg.channel,
        `Case #${theCase.case_number} created for **${user.username}#${user.discriminator}**`,
      );
    } else {
      sendSuccessMessage(pluginData, msg.channel, `Case #${theCase.case_number} created`);
    }

    // Log the action
    pluginData.state.serverLogs.log(LogType.CASE_CREATE, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
      caseNum: theCase.case_number,
      caseType: type.toUpperCase(),
      reason,
    });
  },
});
