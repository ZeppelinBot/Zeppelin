import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { canActOn, hasPermission, resolveMessageMember } from "../../../../pluginUtils.js";
import { resolveMember, resolveUser } from "../../../../utils.js";
import { isBanned } from "../../functions/isBanned.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualForceBanCmd } from "./actualForceBanCmd.js";

const opts = {
  mod: ct.member({ option: true }),
};

export const ForceBanMsgCmd = modActionsMsgCmd({
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
    const user = await resolveUser(pluginData.client, args.user, "ModActions:ForceBanMsgCmd");
    if (!user.id) {
      pluginData.state.common.sendErrorMessage(msg, `User not found`);
      return;
    }

    // If the user exists as a guild member, make sure we can act on them first
    const authorMember = await resolveMessageMember(msg);
    const targetMember = await resolveMember(pluginData.client, pluginData.guild, user.id);
    if (targetMember && !canActOn(pluginData, authorMember, targetMember)) {
      pluginData.state.common.sendErrorMessage(msg, "Cannot forceban this user: insufficient permissions");
      return;
    }

    // Make sure the user isn't already banned
    const banned = await isBanned(pluginData, user.id);
    if (banned) {
      pluginData.state.common.sendErrorMessage(msg, `User is already banned`);
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = authorMember;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
        pluginData.state.common.sendErrorMessage(msg, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    actualForceBanCmd(pluginData, msg, msg.author.id, user, args.reason, [...msg.attachments.values()], mod);
  },
});
