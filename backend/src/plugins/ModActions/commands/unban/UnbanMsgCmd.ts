import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { hasPermission } from "../../../../pluginUtils";
import { resolveUser } from "../../../../utils";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualUnbanCmd } from "../../functions/actualCommands/actualUnbanCmd";
import { modActionsMsgCmd } from "../../types";

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
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `User not found`);
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg, channelId: msg.channel.id }))) {
        pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    actualUnbanCmd(pluginData, msg, msg.author.id, user, args.reason, [...msg.attachments.values()], mod);
  },
});
