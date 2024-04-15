import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { canActOn, hasPermission } from "../../../../pluginUtils";
import { resolveMember, resolveUser } from "../../../../utils";
import { actualForceBanCmd } from "./actualForceBanCmd";
import { isBanned } from "../../functions/isBanned";
import { modActionsMsgCmd } from "../../types";

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
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      pluginData.state.common.sendErrorMessage(msg, `User not found`);
      return;
    }

    // If the user exists as a guild member, make sure we can act on them first
    const member = await resolveMember(pluginData.client, pluginData.guild, user.id);
    if (member && !canActOn(pluginData, msg.member, member)) {
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
    let mod = msg.member;
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
