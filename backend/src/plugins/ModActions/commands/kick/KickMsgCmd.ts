import { hasPermission } from "vety/helpers";
import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { resolveMessageMember } from "../../../../pluginUtils.js";
import { resolveUser } from "../../../../utils.js";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualKickCmd } from "./actualKickCmd.js";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
  clean: ct.bool({ option: true, isSwitch: true }),
};

export const KickMsgCmd = modActionsMsgCmd({
  trigger: "kick",
  permission: "can_kick",
  description: "Kick the specified member",

  signature: [
    {
      user: ct.string(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user, "ModActions:KickMsgCmd");
    if (!user.id) {
      pluginData.state.common.sendErrorMessage(msg, `User not found`);
      return;
    }

    const authorMember = await resolveMessageMember(msg);

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = authorMember;
    if (args.mod) {
      if (!(await hasPermission(await pluginData.config.getForMessage(msg), "can_act_as_other"))) {
        pluginData.state.common.sendErrorMessage(msg, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    let contactMethods;
    try {
      contactMethods = readContactMethodsFromArgs(args);
    } catch (e) {
      pluginData.state.common.sendErrorMessage(msg, e.message);
      return;
    }

    actualKickCmd(
      pluginData,
      msg,
      authorMember,
      user,
      args.reason,
      [...msg.attachments.values()],
      mod,
      contactMethods,
      args.clean,
    );
  },
});
