import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { hasPermission, sendErrorMessage } from "../../../../pluginUtils";
import { UserNotificationMethod, resolveUser } from "../../../../utils";
import { actualBanCmd } from "../../functions/actualCommands/actualBanCmd";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs";
import { modActionsMsgCmd } from "../../types";

const opts = {
  mod: ct.member({ option: true }),
  notify: ct.string({ option: true }),
  "notify-channel": ct.textChannel({ option: true }),
  "delete-days": ct.number({ option: true, shortcut: "d" }),
};

export const BanMsgCmd = modActionsMsgCmd({
  trigger: "ban",
  permission: "can_ban",
  description: "Ban or Tempban the specified member",

  signature: [
    {
      user: ct.string(),
      time: ct.delay(),
      reason: ct.string({ required: false, catchAll: true }),

      ...opts,
    },
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
      if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
        sendErrorMessage(pluginData, msg.channel, "You don't have permission to use -mod");
        return;
      }

      mod = args.mod;
    }

    let contactMethods: UserNotificationMethod[] | undefined;
    try {
      contactMethods = readContactMethodsFromArgs(args) ?? undefined;
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, e.message);
      return;
    }

    actualBanCmd(
      pluginData,
      msg.channel,
      user,
      args["time"] ? args["time"] : null,
      args.reason || "",
      [...msg.attachments.values()],
      msg.member,
      mod,
      contactMethods,
    );
  },
});
