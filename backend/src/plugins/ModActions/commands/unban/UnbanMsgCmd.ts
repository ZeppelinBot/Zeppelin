import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { hasPermission, resolveMessageMember } from "../../../../pluginUtils.js";
import { resolveUser } from "../../../../utils.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualUnbanCmd } from "./actualUnbanCmd.js";

const opts = {
  mod: ct.member({ option: true }),
};

export const UnbanMsgCmd = modActionsMsgCmd({
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
    const user = await resolveUser(pluginData.client, args.user, "ModActions:UnbanMsgCmd");
    if (!user.id) {
      pluginData.state.common.sendErrorMessage(msg, `User not found`);
      return;
    }

    const authorMember = await resolveMessageMember(msg);

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = authorMember;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg, channelId: msg.channel.id }))) {
        pluginData.state.common.sendErrorMessage(msg, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    actualUnbanCmd(pluginData, msg, msg.author.id, user, args.reason, [...msg.attachments.values()], mod);
  },
});
