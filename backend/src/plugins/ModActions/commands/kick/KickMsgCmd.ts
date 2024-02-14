import { hasPermission } from "knub/helpers";
import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { sendErrorMessage } from "../../../../pluginUtils";
import { resolveUser } from "../../../../utils";
import { actualKickCmd } from "../../functions/actualCommands/actualKickCmd";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs";
import { modActionsMsgCmd } from "../../types";

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
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!(await hasPermission(await pluginData.config.getForMessage(msg), "can_act_as_other"))) {
        sendErrorMessage(pluginData, msg.channel, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    let contactMethods;
    try {
      contactMethods = readContactMethodsFromArgs(args);
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, e.message);
      return;
    }

    actualKickCmd(
      pluginData,
      msg.channel,
      msg.member,
      user,
      args.reason,
      [...msg.attachments.values()],
      mod,
      contactMethods,
      args.clean,
    );
  },
});
