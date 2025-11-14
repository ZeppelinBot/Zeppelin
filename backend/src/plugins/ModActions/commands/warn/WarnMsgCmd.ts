import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { canActOn, hasPermission, resolveMessageMember } from "../../../../pluginUtils.js";
import { errorMessage, resolveMember, resolveUser } from "../../../../utils.js";
import { isBanned } from "../../functions/isBanned.js";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualWarnCmd } from "./actualWarnCmd.js";

export const WarnMsgCmd = modActionsMsgCmd({
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
    const user = await resolveUser(pluginData.client, args.user, "ModActions:WarnMsgCmd");
    if (!user.id) {
      await pluginData.state.common.sendErrorMessage(msg, `User not found`);
      return;
    }

    const authorMember = await resolveMessageMember(msg);
    const memberToWarn = await resolveMember(pluginData.client, pluginData.guild, user.id);

    if (!memberToWarn) {
      const _isBanned = await isBanned(pluginData, user.id);
      if (_isBanned) {
        await pluginData.state.common.sendErrorMessage(msg, `User is banned`);
      } else {
        await pluginData.state.common.sendErrorMessage(msg, `User not found on the server`);
      }

      return;
    }

    // Make sure we're allowed to warn this member
    if (!canActOn(pluginData, authorMember, memberToWarn)) {
      await pluginData.state.common.sendErrorMessage(msg, "Cannot warn: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = authorMember;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
        msg.channel.send(errorMessage("You don't have permission to use -mod"));
        return;
      }

      mod = args.mod;
    }

    let contactMethods;
    try {
      contactMethods = readContactMethodsFromArgs(args);
    } catch (e) {
      await pluginData.state.common.sendErrorMessage(msg, e.message);
      return;
    }

    actualWarnCmd(
      pluginData,
      msg,
      msg.author.id,
      mod,
      memberToWarn,
      args.reason,
      [...msg.attachments.values()],
      contactMethods,
    );
  },
});
